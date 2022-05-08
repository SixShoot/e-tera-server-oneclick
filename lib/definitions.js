"use strict";

class Definitions {
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;

        this.TypeCode = new Map()
            .set(1, () => {
                return this.UInt32();
            })
            .set(2, () => {
                return this.Float();
            })
            .set(5, () => {
                const value = this.UInt32();
                if (![0, 1].includes(value)) throw Error('Attributes(): not a bool', value);
                return Boolean(value);
            });
    }

    Header() {
        let unk1 = this.UInt32();
        let unk2 = this.UInt32();
        let unk3 = this.UInt32();
        let version = this.UInt32();
        let unk4 = this.UInt32();
        let unk5 = this.UInt32();
        let unk6 = this.UInt32();
        let unk7 = this.UInt32();
        return {unk1, unk2, unk3, version, unk4, unk5, unk6, unk7};
    }

    Unk1() {
        return [this.UInt32(), this.UInt32()];
    }

    Address() {
        return [this.UInt16(), this.UInt16()];
    }

    Attributes() {
        let name_index = this.UInt16();
        let type = this.UInt16();
        let value = null;
        if (this.TypeCode.has(type)) value = this.TypeCode.get(type)();
        else value = this.Address();
        return {name_index, type, value};
    }

    Elements() {
        let name_index = this.UInt16();
        let unk1 = this.UInt16();
        let attribute_count = this.UInt16();
        let children_count = this.UInt16();
        let attributes = this.Address();
        let children = this.Address();
        return {name_index, unk1, attribute_count, children_count, attributes, children};
    }

    StringRegion(size) {
        let values = this.Region({type: 'Str'});
        let metadata = this.Region({type: 'Region', opts: {type: 'Meta'}, size, writesize: false});
        let addresses = this.Region({type: 'Address', offby: -1});
        return {values, metadata, addresses};
    }

    Str() {
        let size = this.UInt32();
        let used = this.UInt32();
        let value = this.slice(size * 2).toString('ucs2');
        return {size, used, value};
    }

    Meta() {
        let unk1 = this.UInt32();
        let length = this.UInt32();
        let id = this.UInt32();
        let address = this.Address();
        return {unk1, length, id, address};
    }

    Footer() {
        return [this.UInt32()];
    }

    Region({
               type = [],
               opts = {},
               size = 0,
               actual = 0,
               offby = 0,
               writesize = true,
               writeactual = false,
               debug = false
           }) {
        let data = {};

        if (writesize) {
            size = this.UInt32();
            if (debug) console.log('DCReader.Region(): writesize', size);
        }
        if (writeactual) {
            actual = this.UInt32();
            if (debug) console.log('DCReader.Region(): writeactual', actual);
        }

        size += offby;

        let arr = [];

        for (let i = 0; i < size; i++) arr.push(this[type](opts));

        if (writesize) data.size = size;
        if (writeactual) data.actual = actual;
        if (arr[0]) data.data = arr;

        return data;
    }

    slice(length) {
        let data = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return data;
    }

    Float(offset) {
        if (offset) this.offset = offset;
        let data = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return data;
    }

    UInt16(offset,) {
        if (offset) this.offset = offset;
        let data = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return data;
    }

    UInt32(offset) {
        if (offset) this.offset = offset;
        let data = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return data;
    }
}

module.exports.Definitions = Definitions;