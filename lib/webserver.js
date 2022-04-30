'use strict';

const child = require('child_process').execFile;
const exec = require('child_process').execSync;
const path = require('path');
const {app} = require('electron');
const fs = require('fs-extra');
const extract = require('extract-zip');
const {addHostEntry, getEntries, addHostsEntry} = require('electron-hostile');
const {Networking} = require('./networking');

const net = new Networking()

class WebServer {
    constructor() {
        this.root = app.isPackaged ? path.join(app.getAppPath(), '..', '..') : app.getAppPath();

        this.apache_exec_path = path.join('webserver', 'apache', 'bin', 'httpd.exe');
        this.apache_conf_path = path.join('webserver', 'apache', 'conf', 'httpd.conf');
        this.is_running = false;
        this.pid = null;
        this.php_pid = null;
        this.sql_pid = null;

        this.vhosts = [];
        this.vhosts_config_path = path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts');
        this.vhost_conf_path = path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts.conf');

        this.base_vhost = {};
        this.base_vhost.root = path.join(this.root, 'webserver', 'apache', 'htdocs');
        this.base_vhost.override = 'AllowOverride all';

        this.php_fpm = [];
        this.php_fpm['win32'] = path.join('webserver', 'php', 'php-cgi.exe');

        this.mariadb = [];
        this.mariadbrun = [];
        this.mariadb['win32'] = path.join('webserver', 'mariadb', 'bin', 'mariadbd.exe');
        this.mariadbrun['win32'] = path.join('webserver', 'mariadb', 'bin', 'mariadb.exe');
    }

    async addToVhostConf(name) {
        fs.appendFileSync(this.vhost_conf_path, 'Include "${VHOSTROOT}\\' + name + '.local"\n');
    }

    async create_wordpress(event, name) {
        let root = path.join(this.base_vhost.root, name + '.local');
        const file_content = await net.download('https://app.fructiweb.com/latest.zip');
        const fileStream = fs.createWriteStream(path.join(this.base_vhost.root, 'tmp', 'wordpress.zip'));

        await new Promise((resolve, reject) => {
            file_content.body.pipe(fileStream);
            file_content.body.on("error", reject);
            fileStream.on("finish", resolve);
        });

        await extract(path.join(this.base_vhost.root, 'tmp', 'wordpress.zip'), {dir: path.join(this.base_vhost.root, 'tmp')});

        fs.moveSync(path.join(this.base_vhost.root, 'tmp', 'wordpress'), root);

        await this.addToVhostConf(name);

        await addHostsEntry('127.0.0.1', name + '.local', 'WRAPPER', {
            name: 'LightLocal',
            icon: '/static/img.png'
        });

        let vhost = '<VirtualHost *:80>\n';
        vhost += '\tDocumentRoot "' + root + '"\n';
        vhost += '\tServerName ' + name + '.local\n';
        vhost += '\tOptions FollowSymLinks\n';
        vhost += '\t<IfModule mod_headers.c>\n';
        vhost += '\t\tHeader set Access-Controll-Allow-Origin "*"\n';
        vhost += '\t</IfModule>\n';
        vhost += '\t<Files ~ "\\.(php|phtml)$">\n';
        vhost += '\t\tSetHandler "proxy:fcgi://127.0.0.1:9000#"\n';
        vhost += '\t</Files>\n';
        vhost += '\tErrorLog "' + path.join('conf', 'extra', 'vhostConf', 'vhosts', name + '.log') + '"\n';
        vhost += '</VirtualHost>\n\n';

        fs.writeFileSync(path.join(this.vhosts_config_path, name + '.local'), vhost);

        let wpconfig = fs.readFileSync(path.join(root, 'wp-config-sample.php'), 'utf-8').toString().split("\n");

        wpconfig.splice(22, 1, "define( 'DB_NAME', '" + name + "' );");
        wpconfig.splice(25, 1, "define( 'DB_USER', 'root' );");
        wpconfig.splice(28, 1, "define( 'DB_PASSWORD', '' );");
        wpconfig = wpconfig.join("\n");

        await this.start(event);

        try {
            exec(this.mariadbrun[process.platform] + ' -uroot -e "CREATE DATABASE ' + name + '"');
        } catch (e) {
            console.log(e);
        }

        await this.stop(event);
        if (this.is_running)
            await this.start(event);

        fs.writeFileSync(path.join(root, 'wp-config.php'), wpconfig, 'utf-8');
        event.reply('create_vhost', name);
    }

    async start(event) {
        if (!this.is_running) {
            try {
                this.pid = child(this.apache_exec_path).pid;
                this.php_pid = child(this.php_fpm[process.platform], ['-b', '127.0.0.1:9000']).pid;
                this.sql_pid = child(this.mariadb[process.platform]).pid;

                this.is_running = true;
                event.reply('start_server', 0);
            } catch (err) {
                console.log(err);
                event.reply('start_server', 1);
            }
        } else {
            console.log('issue')
            event.reply('start_server', 1);
        }
    }

    async stop(event) {
        if (this.is_running) {
            try {
                process.kill(this.pid);
                process.kill(this.php_pid);
                process.kill(this.sql_pid);
                this.is_running = false;
                event.reply('stop_server', 0);
            } catch (err) {
                event.reply('stop_server', 1);
            }
        } else {
            event.reply('stop_server', 1);
        }
    }

    list_vhosts() {
        if (!fs.existsSync(this.vhosts_config_path))
            return;
        let vhosts_folder = fs.readdirSync(this.vhosts_config_path);

        for (let i = 0; i < vhosts_folder.length; i++) {
            if (vhosts_folder[i].split('.')[1] === 'local')
                this.vhosts[vhosts_folder[i]] = fs.readFileSync(path.join(this.vhosts_config_path, vhosts_folder[i]), 'utf-8');
            else
                vhosts_folder.splice(i, 1);
        }

        return vhosts_folder;
    }

    async create_vhost(event, args) {
        if (!fs.existsSync(path.join(this.vhosts_config_path, args['name']))) {
            if (args['stack_choice'] === 'wordpress') {
                await this.create_wordpress(event, args['name']);
            } else
                return false;
        }
    }
}

exports.WebServer = WebServer;