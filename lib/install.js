'use strict';

const child = require('child_process').execFile;
const path = require('path');
const {app} = require('electron');
const fs = require('fs-extra');

const {Networking} = require('./networking');
const extract = require("extract-zip");

class Install {
    constructor(event) {
        this.root = app.isPackaged ? path.join(app.getAppPath(), '..', '..') : app.getAppPath();

        this.apache_path = path.join('webserver', 'apache');
        this.php_path = path.join('webserver', 'php');
        this.sql_path = path.join('webserver', 'mariadb');

        this.mariadb = [];
        this.mariadb['win32'] = 'mariadb-install-db.exe';

        this.apache_httpd = '';
        this.httpd_vhost = '';
        this.php_ini = '';
        this.apache_conf_path = path.join('webserver', 'apache', 'conf', 'httpd.conf');

        this.php_remote = [];
        this.php_remote['win32'] = 'https://windows.php.net/downloads/releases/php-8.1.5-nts-Win32-vs16-x64.zip';

        this.apache_remote = [];
        this.apache_remote['win32'] = 'https://www.apachehaus.com/downloads/httpd-2.4.53-o111n-x64-vs17.zip';

        this.mariadb_remote = [];
        this.mariadb_remote['win32'] = 'https://mirror.mva-n.net/mariadb/mariadb-10.6.7/winx64-packages/mariadb-10.6.7-winx64.zip';
        this.event = event;
    }

    async downloadAndExtract(name_remote, name_local, remote_link) {
        let networking = new Networking();
        const file_content = await networking.download(remote_link);
        const fileStream = fs.createWriteStream(path.join('tmp', name_remote));

        if (!fs.existsSync(path.join('tmp')))
            fs.mkdirSync(path.join('tmp'));

        await new Promise((resolve, reject) => {
            file_content.body.pipe(fileStream);
            file_content.body.on("error", reject);
            fileStream.on("finish", resolve);
        });

        this.event.reply('important', 'downloaded');

        try {
            await extract(path.join('tmp', name_remote), {dir: path.join(this.root, 'webserver', name_local)});
        } catch (e) {
            this.event.reply('important', e);
        }

        this.event.reply('important', 'extracted ');
    }

    checkApacheExist() {
        return fs.existsSync(this.apache_path);
    }

    checkPhpExist() {
        return fs.existsSync(this.php_path);
    }

    checkSqlExist() {
        return fs.existsSync(this.sql_path);
    }

    checkApacheConfigured() {
        this.apache_httpd = fs.readFileSync(path.join(this.apache_path, 'conf', 'httpd.conf'), 'utf-8');
        this.httpd_vhost = fs.readFileSync(path.join(this.apache_path, 'conf', 'extra', 'httpd-vhosts.conf'), 'utf-8');

        this.apache_httpd = this.apache_httpd.toString().split('\n');
        if (this.apache_httpd.indexOf('ProxyFCGIBackendType GENERIC') === -1) {
            return false;
        }

        this.httpd_vhost = this.httpd_vhost.toString().split('\n');
        if (this.httpd_vhost.indexOf('DocumentRoot "${SRVROOT}/htdocs"') === -1) {
            return false;
        }
    }

    checkSqlInstalled() {
        return fs.existsSync(path.join(this.sql_path, 'data'));

    }

    checkPhpIni() {
        this.php_ini = fs.readFileSync(path.join(this.php_path, 'php.ini'), 'utf-8');

        this.php_ini = this.php_ini.toString().split('\n');
        if (this.php_ini.indexOf('extension_dir = "./ext"') === -1) {
            return false;
        }
    }

    async installPhp() {
        await this.downloadAndExtract('php.zip', 'php', this.php_remote[process.platform]);
    }

    async installApache() {
        await this.downloadAndExtract('apache.zip', 'apache_tmp', this.apache_remote[process.platform]);
        fs.moveSync(path.join('webserver', 'apache_tmp', 'Apache24'), path.join('webserver', 'apache'));
        fs.removeSync(path.join('webserver', 'apache_tmp'));
    }

    async installSql() {
        await this.downloadAndExtract('mariadb.zip', 'mariadb_tmp', this.mariadb_remote[process.platform]);
        fs.moveSync(path.join('webserver', 'mariadb_tmp', 'mariadb-10.6.7-winx64'), path.join('webserver', 'mariadb'))
        fs.removeSync(path.join('webserver', 'mariadb_tmp'));
    }

    configurePhp() {
        this.php_ini = fs.readFileSync(path.join(app.getAppPath(), 'tpl', 'php.ini'), 'utf-8');
        fs.writeFileSync(path.join(this.php_path, 'php.ini'), this.php_ini, 'utf-8');
    }

    configureApache() {
        this.apache_httpd = fs.readFileSync(path.join(app.getAppPath(), 'tpl', 'httpd.conf'), 'utf-8');
        fs.writeFileSync(path.join(this.apache_path, 'conf', 'httpd.conf'), this.apache_httpd, 'utf-8');

        this.httpd_vhost = fs.readFileSync(path.join(app.getAppPath(), 'tpl', 'httpd-vhosts.conf'), 'utf-8');
        fs.writeFileSync(path.join(this.apache_path, 'conf', 'extra', 'httpd-vhosts.conf'), this.httpd_vhost, 'utf-8');

        if (!fs.existsSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf'))) {
            fs.mkdirSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf'));
            if (!fs.existsSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts'))) {
                fs.mkdirSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts'));
            }
            if (!fs.existsSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts.conf'))) {
                fs.createFileSync(path.join('webserver', 'apache', 'conf', 'extra', 'vhostConf', 'vhosts.conf'));
            }
        }
        if (!fs.existsSync(path.join('webserver', 'apache', 'htdocs', 'tmp'))) {
            fs.mkdirSync(path.join('webserver', 'apache', 'htdocs', 'tmp'));
        }

        let file_conf = fs.readFileSync(this.apache_conf_path, 'utf-8').toString().split("\n");

        file_conf.splice(38, 1, 'Define SRVROOT "' + path.join(this.root, 'webserver', 'apache') + '"');
        let new_conf = file_conf.join("\n");

        fs.writeFileSync(this.apache_conf_path, new_conf, 'utf-8');
    }

    configureSql() {
        child(path.join(this.sql_path, 'bin', this.mariadb[process.platform]));
    }

    async verifyInstall() {
        if (!fs.existsSync('webserver'))
            fs.mkdirSync('webserver');
        
        let installation_status = false;

        if (this.checkApacheExist()) {
            if (!this.checkApacheConfigured())
                this.configureApache();
        } else {
            this.event.reply('important', 'installing apache');
            await this.installApache();
            this.configureApache();
            installation_status = true;
        }

        if (this.checkPhpExist()) {
            if (!this.checkPhpIni())
                this.configurePhp();
        } else {
            this.event.reply('important', 'installing php');
            await this.installPhp();
            this.configurePhp();
            installation_status = true;
        }

        if (this.checkSqlExist()) {
            if (!this.checkSqlInstalled())
                this.configureSql();
        } else {
            this.event.reply('important', 'installing mariadb');
            await this.installSql();
            this.configureSql();
            installation_status = true;
        }

        if (installation_status)
            this.event.reply('important', 'done');
    }
}

exports.Install = Install;