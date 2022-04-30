'use strict';
const querystring = require('querystring');
const storage = window.localStorage;

let query = querystring.parse(global.location.search);
let token = query['?token'];

function add_token() {
    let token = document.getElementById('token-input').value;
    ipcRenderer.send('add-token', token);
}

/*
* Load all needed functions to parse and check remotely available mods and versions
 */

window.onload = async function () {
    storage.clear();

    ipcRenderer.send('version');

    openTab('home', document.getElementsByClassName('nav-item')[0].children[0]);

    ipcRenderer.send('get_vhosts_list');

    if (token === "") {
        document.getElementById('modal-title').innerText = 'Production token';
        let content = document.getElementById('modal-content');
        let form = document.createElement('form');
        form.onsubmit = () => {
            add_token();
        };

        let label = document.createElement('label');
        let input = document.createElement('input');
        let button = document.createElement('button');

        label.innerText = "Ajoutez le token donné par l'administrateur";
        label.htmlFor = 'token-input';

        input.type = 'text';
        input.id = 'token-input';
        input.className = 'mb-3';

        button.className = 'btn btn-primary';
        button.innerText = 'Envoyer';

        form.appendChild(label);
        form.innerHTML += '<br />';
        form.appendChild(input);
        form.innerHTML += '<br />';
        form.appendChild(button);
        form.innerHTML += '<br />';
        content.appendChild(form);

        $('#modal').modal('show');
    } else {
        ipcRenderer.send('install');
    }
}

ipcRenderer.on('version', (event, version) => {
    document.getElementById('version').innerText += ' ' + version;
});

ipcRenderer.on('get_vhosts_list', (event, list) => {
    let vhost_list = document.getElementById('vhosts-list');

    if (list) {
        for (let i = 0; i < list.length; i++) {
            let div_parent = document.createElement('div');
            let div_child = document.createElement('div');
            let text = document.createElement('p');
            let deploy_button = document.createElement('button');
            let link_fa = document.createElement('i');

            div_parent.className = 'card bg-dark border border-primary';
            div_parent.style.setProperty('height', '10%', 'important');
            div_parent.setAttribute('id', list[i].split('.')[0]);

            div_child.classList.add('card-body');
            div_child.classList.add('text-center');

            link_fa.classList.add('fa-solid');
            link_fa.classList.add('fa-link');

            text.classList.add('card-text');
            text.style.setProperty('cursor', 'pointer');
            text.innerHTML = '<i className="fa-solid fa-link"></i>';
            text.onclick = () => {
                require('electron').shell.openExternal('http://' + list[i]);
            }
            text.innerText = list[i];

            deploy_button.onclick = () => {
                deploy_website(list[i].split('.')[0]);
            }
            deploy_button.classList.add('btn');
            deploy_button.classList.add('btn-success');
            deploy_button.innerText = 'Deploy to server';

            text.appendChild(link_fa);
            div_child.appendChild(text);
            div_child.appendChild(deploy_button);
            div_parent.appendChild(div_child);
            vhost_list.appendChild(div_parent);
        }
    }
});

ipcRenderer.on('important', (event, msg) => {
    $('#modal').modal('show');
    document.getElementById('modal-content').innerHTML += msg + '<br/>';
});