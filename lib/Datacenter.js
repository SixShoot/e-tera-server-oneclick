"use strict";

const {Unpack} = require('./unpack');
const {app} = require("electron");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const fs = require("fs");

const root = app.isPackaged ? path.join(app.getAppPath(), '..', '..') : app.getAppPath();

class Datacenter {
    constructor(DCLang) {
        this.DCPath = path.join(root, 'Datacenter', 'DataCenter_Final_' + DCLang + '.dat');
        this.output = path.join(root, 'Datacenter', 'out', DCLang);
        this.unpacked  = null;
    }

    read() {
        this.DC = new Unpack(this.unpacked);
        this.DataCenter = this.DC.parse({debug: true, mapStrs: true});
    }

    decrypt(key, iv) {
        if (key.length !== 32) throw Error("Invalid key length");
        if (iv.length !== 32) throw Error("Invalid IV length");

        const original = fs.readFileSync(this.DCPath);
        console.log("original size", original.length);
        console.log("original sha256", sha(original));

        const decipher = crypto.createDecipheriv('aes-128-cfb', StringToByteArray(key), StringToByteArray(iv));

        let decrypted = decipher.update(original);
        decipher.final();
        console.log("decrypted size", decrypted.length);
        console.log("decrypted sha256", sha(decrypted));

        if (decrypted.readUInt16LE(4) !== 0x9c78) throw Error("Incorrect key/iv");

        let unpacked = zlib.inflateSync(decrypted.slice(4, decrypted.length));
        console.log("unpacked size", unpacked.length);
        console.log("unpacked sha256", sha(unpacked));

        this.unpacked = unpacked;
    }

    getFiles() {
        let root = this.DataCenter.Elements.data[0].data[0];
        let child = [];

        for (let i = 0; i < root.children_count; i++) {
            let ref = this.DataCenter.Elements.data[root.children[0]].data[root.children[1] + i];
            child.push({ ref, name: this.get_Name(ref) });
        }

        let files = {};
        for (let n of child) {
            if (files[n.name]) {
                if (!Array.isArray(files[n.name])) {
                    if (!fs.existsSync(path.join(this.output, n.name))) fs.mkdirSync(path.join(this.output, n.name), { recursive: true });
                    let temp = files[n.name];
                    files[n.name] = [];
                    files[n.name].push(temp);
                }
                files[n.name].push(n.ref);
            } else {
                files[n.name] = n.ref;
            }
        }
        this.files = files;
    }

    writeFiles() {
        Object.keys(this.files).forEach(file => {
            if (Array.isArray(this.files[file])) {
                console.log(file, `(x${this.files[file].length})`);
                for (let n in this.files[file]) fs.writeFileSync(path.join(this.output, file, `${file}-${n}.json`), JSON.stringify(this.build(this.files[file][n]), null, '\t'));
            } else {
                console.log(file);
                fs.writeFileSync(path.join(this.output, file + '.json'), JSON.stringify(this.build(this.files[file]), null, '\t'));
            }
        });
    }

    get_String(ref) {
        return this.DataCenter.Strings.map.get(`${ref[0]},${ref[1]}`);
    }

    build(elem) {
        let obj = {};

        if (elem.attribute_count > 0)
            for (let i = 0; i < elem.attribute_count; i++) {
                let ref = this.DataCenter.Attributes.data[elem.attributes[0]].data[elem.attributes[1] + i];
                let key = this.get_Name(ref);
                obj[key] = typeof ref.value === 'object' ? this.get_String(ref.value) : ref.value;
            }

        if (elem.children_count > 0)
            for (let i = 0; i < elem.children_count; i++) {
                let ref = this.DataCenter.Elements.data[elem.children[0]].data[elem.children[1] + i];
                let key = this.get_Name(ref);
                if (!obj[key]) obj[key] = [];
                obj[key].push(this.build(ref));
            }

        return obj;
    }

    get_Name(ref) {
        if (ref.name_index === 0) return '__placeholder__';
        ref = this.DataCenter.Names.addresses.data[ref.name_index - 1];
        return this.DataCenter.Names.map.get(`${ref[0]},${ref[1]}`);
    }
}

exports.Datacenter = Datacenter;

function StringToByteArray(str) {
    let buf = Buffer.alloc(16);
    let subI = 3;
    for (let i = 0; i < str.length; i += 2) {
        console.log(Buffer.from(str.substr(i, 2), 'hex')[0]);
        console.log(Buffer.from(str.substr(i, 2), 'hex'));
        console.log(Buffer.from(str.substring(i, 3), 'hex')[0]);
        console.log(Buffer.from(str.substring(i, 3), 'hex'));
        //buf[i / 2] = Buffer.from(str.substring(i, subI), 'hex')[0];
        subI += 3;
    }
    return buf;
}

function sha(data) {
    return crypto.createHash("SHA256").update(data).digest("hex");
}