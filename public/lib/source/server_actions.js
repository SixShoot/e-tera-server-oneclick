function start_server(t) {
    t.setAttribute('disabled', true);
    document.getElementById('stop_server').removeAttribute('disabled');
    ipcRenderer.send('start_server');
}

function stop_server(t) {
    t.setAttribute('disabled', true);
    document.getElementById('start_server').removeAttribute('disabled');
    ipcRenderer.send('stop_server');
}

function deploy_website(t) {
    console.log(t);
    let website = document.getElementById(t);

    website.children[0].children[1].setAttribute('disabled', true);
    //t.setAttribute('disabled', true);
}

function create_vhost(t) {
    const formData = new FormData(t);
    let args = [];

    let button = t.getElementsByTagName('button');

    for (let [key, value] of formData.entries()) {
        args[key] = value;
    }

    button[0].setAttribute('disabled', true);
    ipcRenderer.send('create_vhost', args);
}

function add_vhost() {
    document.getElementById('modal-title').innerText = 'Créer un site web';
    let content = document.getElementById('modal-content');
    let form = document.createElement('form');
    form.onsubmit = () => {
        create_vhost(form);
        return false;
    };

    form.classList.add('text-center');

    let label = document.createElement('label');
    let input = document.createElement('input');
    let inputCheckboxWordpress = document.createElement('input');
    let labelWordpress = document.createElement('label');
    let inputCheckboxWordpressBedrock = document.createElement('input');
    let labelWordpressBedrock = document.createElement('label');
    let button = document.createElement('button');

    label.innerText = "Quel nom pour votre site ?";
    label.htmlFor = 'name';

    input.type = 'text';
    input.name = 'name';
    input.className = 'mb-3';

    button.className = 'btn btn-primary';
    button.innerText = 'Validate';

    inputCheckboxWordpress.type = 'radio';
    inputCheckboxWordpress.name = 'stack_choice';
    inputCheckboxWordpress.value = 'wordpress';
    inputCheckboxWordpress.id = 'wordpress';

    labelWordpress.textContent = 'Wordpress';
    labelWordpress.htmlFor = 'wordpress';

    inputCheckboxWordpressBedrock.type = 'radio';
    inputCheckboxWordpressBedrock.name = 'stack_choice';
    inputCheckboxWordpressBedrock.value = 'wordpressbedrock';
    inputCheckboxWordpressBedrock.id = 'wordpressbedrock';

    labelWordpressBedrock.textContent = 'Wordpress Bedrock';
    labelWordpressBedrock.htmlFor = 'wordpressbedrock';

    form.appendChild(label);
    form.innerHTML += '<br />';
    form.appendChild(input);
    form.innerHTML += '<br />';
    form.appendChild(inputCheckboxWordpress);
    form.appendChild(labelWordpress);
    form.innerHTML += '<br />';
    form.appendChild(inputCheckboxWordpressBedrock);
    form.appendChild(labelWordpressBedrock);
    form.innerHTML += '<br />';
    form.appendChild(button);
    form.innerHTML += '<br />';
    content.appendChild(form);

    $('#modal').modal('show');
}

ipcRenderer.on('stop_server', (event, response) => {
    if (response === 1) {
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error-message').innerText = "Erreur de l'arrêt du serveur web";
        document.getElementById('error-message').style.color = 'red';
    } else {
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error-message').innerText = 'Serveur web arrêté avec succès';
        document.getElementById('error-message').style.color = 'green';
    }

    setTimeout(() => {
        document.getElementById('error').classList.add('hidden');
    },5000);
});

ipcRenderer.on('start_server', (event, response) => {
    if (response === 1) {
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error-message').innerText = 'Erreur de démarrage du serveur web';
        document.getElementById('error-message').style.color = 'red';
    } else {
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error-message').innerText = 'Serveur web démarré avec succès';
        document.getElementById('error-message').style.color = 'green';
    }

    setTimeout(() => {
        document.getElementById('error').classList.add('hidden');
    },5000);
});

ipcRenderer.on('create_vhost', (event, name) => {
    $('#modal').modal('hide');
    let vhost_list = document.getElementById('vhosts-list');
    name += '.local';

    let div_parent = document.createElement('div');
    let div_child = document.createElement('div');
    let text = document.createElement('p');
    let deploy_button = document.createElement('button');

    div_parent.className = 'card bg-dark border border-primary';
    div_parent.style.setProperty('height', '10%', 'important');
    div_parent.setAttribute('id', name);

    div_child.classList.add('card-body');
    div_child.classList.add('text-center');

    text.classList.add('card-text');
    text.innerText = name;

    deploy_button.onclick = () => {
        deploy_website(name);
    }
    deploy_button.classList.add('btn');
    deploy_button.classList.add('btn-success');
    deploy_button.innerText = 'Deploy to server';

    div_child.appendChild(text);
    div_child.appendChild(deploy_button);
    div_parent.appendChild(div_child);
    vhost_list.appendChild(div_parent);
});

$('#modal').on('hidden.bs.modal', () => {
    document.getElementById('modal-content').innerHTML = '';
});