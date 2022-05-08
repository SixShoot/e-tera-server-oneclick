"use strict";

const {Definitions} = require('./definitions');

class Unpack {
    constructor(buffer) {
        this.def = new Definitions(buffer);
    }

    parse({debug = false, mapStrs = false}) {
        mapStrs = mapStrs ? ['Strings', 'Names'] : [];

        if (debug) console.time('DCReader.parse()');
        const parsed = {};

        if (debug) console.log('DCReader.parse(): Reading Header');
        parsed.Header = this.def.Header();

        if (debug) console.log('DCReader.parse(): Reading Unk1');
        parsed.Unk1 = this.def.Region({type: 'Unk1'});

        if (debug) console.log('DCReader.parse(): Reading Attributes');
        parsed.Attributes = this.def.Region({type: 'Region', opts: {type: 'Attributes', writeactual: true}});

        if (debug) console.log('DCReader.parse(): Reading Elements');
        parsed.Elements = this.def.Region({type: 'Region', opts: {type: 'Elements', writeactual: true}});

        if (debug) console.log('DCReader.parse(): Reading Strings');
        parsed.Strings = this.def.StringRegion(1024);

        if (mapStrs.includes('Strings')) {
            if (debug) console.log('DCReader.parse(): Mapping Strings');
            parsed.Strings.map = new Map();
            for (const index in parsed.Strings.values.data) {
                const strings = parsed.Strings.values.data[index].value.split('\0');
                let size = 0;
                for (let string in strings) {
                    parsed.Strings.map.set(`${index},${size}`, strings[string]);
                    size += strings[string].length + 1;
                }
            }
        }

        if (debug) console.log('DCReader.parse(): Reading Names');
        parsed.Names = this.def.StringRegion(512);

        if (mapStrs.includes('Names')) {
            if (debug) console.log('DCReader.parse(): Mapping Names');
            parsed.Names.map = new Map();
            for (const index in parsed.Names.values.data) {
                const names = parsed.Names.values.data[index].value.split('\0');
                let size = 0;
                for (let name in names) {
                    parsed.Names.map.set(`${index},${size}`, names[name]);
                    size += names[name].length + 1;
                }
            }
        }

        let buffer = this.def.buffer;
        let offset = this.def.offset;

        if (buffer.length === offset) {
            console.log('DCReader.parse(): Missing Footer!'); // yo pinkie why are u deleting the footer in ur dc mod
            parsed.Footer = {unk1: 0};
        } else {
            if (debug) console.log('DCReader.parse(): Reading Footer');
            parsed.Footer = this.def.Footer();
        }

        buffer = this.def.buffer;
        offset = this.def.offset;

        if (buffer.length === offset) {
            if (debug) {
                console.log('DCReader.parse(): Done!');
                console.timeEnd('DCReader.parse()');
            }
            return parsed;
        } else {
            throw Error(`ERR @ DCReader.parse(): ${buffer.length - offset} bytes left`);
        }
    }
}

exports.Unpack = Unpack;