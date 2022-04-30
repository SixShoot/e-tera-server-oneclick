'use strict';

const fetch = require("node-fetch");

class Networking {
    constructor() {
    }

    async download(url) {
        let settings = {
            method: "GET",
        };
        const response = await fetch(url, settings);
        return await response;
    }

    async get(url) {
        let settings = {
            method: "GET",
            headers: {
                Accept: "application/json; charset=UTF-8",
            }
        };

        const response = await fetch(url, settings);
        return await response.json();
    }
}

exports.Networking = Networking;