function settings() {
    ipcRenderer.send('settings');
}

function apply_new_settings(f) {

}

ipcRenderer.on('settings',(event, sts) => {
    document.getElementById('modal-title').innerText = 'Manage settings';
    let content = document.getElementById('modal-content');
    let form = document.createElement('form');
    form.onsubmit = () => {
        apply_new_settings(form);
        return false;
    };

    form.classList.add('text-center');

    let label = [];
    let input = [];

    let button = document.createElement('button');
    let i = 0;

    for (const [k, v] of Object.entries(sts)) {
        let styling = true;
        label[i] = document.createElement('label');

        label[i].innerText = k + ' = ';
        label[i].htmlfor = k;
        label[i].style.display = 'flex';
        label[i].style.flexDirection = 'row';
        label[i].style.justifyContent = 'flex-end';
        label[i].style.textAlign = 'end';
        label[i].style.width = '400px';
        label[i].lineHeight = '26px';
        label[i].marginBottom = '10px';

        if (typeof v === 'boolean') {
            input[i] = document.createElement('div');
            let iTrue = document.createElement('input');
            let iFalse = document.createElement('input');
            let lTrue = document.createElement('label');
            let lFalse = document.createElement('label');

            iTrue.type = 'radio';
            iTrue.name = k;
            iTrue.value = true;

            iFalse.type = 'radio';
            iFalse.name = k;
            iFalse.value = false;

            if (v) {
                iTrue.setAttribute('checked', true);
            } else {
                iFalse.setAttribute('checked', true);
            }

            lTrue.innerText = 'true';
            lFalse.innerText = 'false';

            lTrue.appendChild(iTrue);
            input[i].appendChild(lTrue);
            input[i].innerHTML += '<br />';
            lFalse.appendChild(iFalse);
            input[i].appendChild(lFalse);
        } else if (typeof v === 'object') {
            input[i] = document.createElement('input');
            styling = false;
        } else if (v instanceof Array) {
            input[i] = document.createElement('input');
        } else {
            input[i] = document.createElement('input');
            input[i].id = k;
            input[i].defaultValue = v;
        }

        if (styling) {
            input[i].style.height = '20px';
            input[i].style.flex = '0 0 200px';
            input[i].marginLeft = '10px';
        }
        i++;
    }

    button.className = 'btn btn-primary';
    button.innerText = 'Validate';

    for(let j = 0; j < i; j++) {
        label[j].appendChild(input[j]);
        form.appendChild(label[j]);
        form.innerHTML += '<br />';
    }

    form.innerHTML += '<br />';
    form.appendChild(button);
    form.innerHTML += '<br />';
    content.appendChild(form);

    $('#modal').modal('show');
});