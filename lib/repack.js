"use strict";

const fs = require('fs-extra');
const path = require("path");

class Repack {
    constructor(DCPathExtracted, DCPath, files) {
        this.DCPathExtracted = DCPathExtracted;
        this.DCPath = DCPath;
        this.files = files;
    }

    getFiles() {
        let files = fs.readdirSync(this.DCPathExtracted);

        let directory = {};

        for (let i in files) {
            if (files[i].split('.json').length === 1) {
                let subFiles;

                if (fs.statSync(path.join(this.DCPathExtracted, files[i])).isDirectory()) {
                    subFiles = fs.readdirSync(path.join(this.DCPathExtracted, files[i]));

                    let key = files[i].split('.')[0];
                    directory[key] = {};

                    for (let n in subFiles) {
                        directory[key][n] = 'name_index: 9592';
                    }
                }
            }
        }

        let dc = directory;

        for (let i = 0; i < files.length; i++) {
            let subFiles;

            if (!fs.statSync(path.join(this.DCPathExtracted, files[i])).isDirectory()) {
                /*subFiles = fs.readdirSync(path.join(this.DCPathExtracted, files[i]));

                let key = files[i].split('.')[0];
                dc[key] = {};

                for (let n in subFiles) {
                    dc[key][n] = 'name_index: 9592';
                }
            } else {*/
                let key = files[i].split('.')[0];
                dc[key] = {};
                dc[key]['name_index'] = 9592;
                dc[key]['unk1'] = 0;
                dc[key]['attribute_count'] = 0;
                dc[key]['children_count'] = 3;
                dc[key]['attributes'] = [65535, 65535];
                dc[key]['children'] = [113, 50327];
            }
        }

        //console.log(this.files);
        console.log(dc);
        //console.log('done');
    }
}

exports.Repack = Repack;