import {Component, OnInit} from '@angular/core';
import {RdfService} from '../../services/rdf.service';
import {Friend} from '../../models/friend.model';
import {ToastrService} from 'ngx-toastr';
import {ChatService} from '../../services/chat.service';
import {message} from '../../models/message.model';
import {listFiles} from 'list-files-in-dir';

declare var require: any;

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {


    mi_listado_de_friends: string[] = [];
    username = '';
    fileClient: any;
    ruta_seleccionada: string;
    messages: message[] = [];
    ruta: string;
    private receiverPicture: string;
    private senderPicture: string;


    constructor(private rdf: RdfService, private toastr: ToastrService, private chat: ChatService) {
    }

    ngOnInit() {
        this.chat.loadFriends().then(res => {
            if (res.length ==  0) {
                document.write('You don\'t have friends to chat');
            } else {
                document.getElementById('receiver').innerHTML = this.getUserByUrl(res[0]);
                this.mi_listado_de_friends = res;
                this.ruta_seleccionada = res[0];



                const name = this.getUserByUrl(this.ruta_seleccionada);
                this.createNewFolder('dechat1a', '/public/');
                this.createNewFolder(name, '/public/dechat1a/');
                //this.generateACL();
            }
        });
        this.fileClient = require('solid-file-client');
        console.log(this.ruta_seleccionada);
        setInterval(() => {
            this.actualizar();
        }, 3000);
    }


    initSelection(ruta) {
        this.messages = [];
        this.ruta_seleccionada = ruta;
        const name = this.getUserByUrl(this.ruta_seleccionada);
        this.createNewFolder('dechat1a', '/public/');
        this.createNewFolder(name, '/public/dechat1a/');
        document.getElementById('receiver').innerHTML = name;
        this.getProfilePicture();
    }

    /**
     * Crear carpeta
     * @param name
     * @param ruta
     */
    private createNewFolder(name: string, ruta: string) {
        //Para crear la carpeta necesito una ruta que incluya el nombre de la misma.
        //Obtengo el ID del usuario y sustituyo  lo irrelevante por la ruta de public/NombreCarpeta
        let solidId = this.rdf.session.webId;
        const stringToChange = '/profile/card#me';
        const path = ruta + name;
        solidId = solidId.replace(stringToChange, path);
        //Necesito logearme en el cliente para que me de permiso, sino me dara un error al intentar
        //crear la carpeta. Como ya estoy en sesion no abre nada pero si se abre la consola se ve
        // que se ejecuta correctamente.
        this.buildFolder(solidId);
    }

    //method that creates the folder using the solid-file-client lib
    private buildFolder(solidId) {
        this.fileClient.readFolder(solidId).then(folder => {
            console.log(`Read ${folder.name}, it has ${folder.files.length} files.`);
        }, err => {
            //Le paso la URL de la carpeta y se crea en el pod. SI ya esta creada no se si la sustituye o no hace nada
            this.fileClient.createFolder(solidId).then(success => {
                console.log(`Created folder ${solidId}.`);
            }, err1 => console.log(err1));
        });
    }

    createFolder() {
        const user = this.getUserByUrl(this.ruta_seleccionada);
        const path = '/public/dechat2a/' + user + '/Conversation.txt';
        let senderId = this.rdf.session.webId;
        const stringToChange = '/profile/card#me';
        senderId = senderId.replace(stringToChange, path);
        const urlArray = this.ruta_seleccionada.split('/');
    }

    async actualizar() {
        const messages_aux = [];
        const user = this.getUserByUrl(this.ruta_seleccionada);
        let senderId = this.rdf.session.webId;
        const stringToChange = '/profile/card#me';
        const path = '/public/dechat1a/' + user + '/Conversation.txt';
        senderId = senderId.replace(stringToChange, path);
        this.ruta = senderId;
        const content = await this.readMessage(senderId);
        console.log('CONTENT:   ' + content);
        if (!(content === undefined)) {

            const messageArray = content.split('\n');
            messageArray.forEach(element => {
                console.log(element.content);
                if (element[0]) {
                    const messageArrayContent = element.split('###');
                    const messageToAdd: message = {
                        content: messageArrayContent[2],
                        date: messageArrayContent[3],
                        sender: messageArrayContent[0],
                        recipient: messageArrayContent[1]
                    };
                    console.log(messageToAdd);
                    messages_aux.push(messageToAdd);
                }
            });
        }

        const urlArray = this.ruta_seleccionada.split('/');
        const url = 'https://' + urlArray[2] + '/public/dechat1a/' + this.getUserByUrl(this.rdf.session.webId) + '/Conversation.txt';
        const contentReceiver = await this.readMessage(url);

        console.log('CONTENT RECEIVER:                    ' + contentReceiver);
        if (!(contentReceiver === undefined)) {
            const messageArrayReceiver = contentReceiver.split('\n');
            messageArrayReceiver.forEach(element => {
                console.log(element.content);
                if (element[0]) {
                    const messageArrayContent = element.split('###');
                    const messageToAdd: message = {
                        content: messageArrayContent[2],
                        date: messageArrayContent[3],
                        sender: messageArrayContent[0],
                        recipient: messageArrayContent[1]
                    };
                    console.log(messageToAdd);
                    messages_aux.push(messageToAdd);
                }
            });
        }

        console.log('TAMAÑO messages_AUX: ' + messages_aux.length);
        console.log('TAMAÑO messages: ' + this.messages.length);

        if (messages_aux.length != this.messages.length) {
            this.messages = [];

            messages_aux.sort(function(a, b) {
                // convert date object into number to resolve issue in typescript
                return  +new Date(a.date) - +new Date(b.date);
            });
            this.messages = messages_aux;
        }
    }


    private async readMessage(url) {
        this.ruta = url;
        const message = await this.searchMessage(url);
        return message;
    }

    //method that search for a message in a pod
    private async searchMessage(url) {
        console.log('URL: ' + url);
        return await this.fileClient.readFile(url).then(body => {
            console.log(`File	content is : ${body}.`);
            return body;
        }, err => console.log(err));

    }

    private getUserByUrl(ruta: string): string {
        let sinhttp;
        sinhttp = ruta.replace('https://', '');
        const user = sinhttp.split('.')[0];
        return user;
    }

    private updateTTL(url, newContent, contentType?) {
        if (contentType) {
            this.fileClient.updateFile(url, newContent, contentType).then(success => {
                console.log(`Updated ${url}.`);
            }, err => console.log(err));
        } else {
            this.fileClient.updateFile(url, newContent).then(success => {
                console.log(`Updated ${url}.`);
            }, err => console.log(err));
        }
       // this.generateACL();
    }


    async write() {
        const myUser = this.getUserByUrl(this.rdf.session.webId);
        const user = this.getUserByUrl(this.ruta_seleccionada);
        const messageContent = (<HTMLInputElement>document.getElementById('comment')).value;
        (document.getElementById('comment') as HTMLInputElement).value = '';
        let senderId = this.rdf.session.webId;
        const senderPerson: Friend = {webid: senderId, name: this.getUserByUrl(senderId), picture: this.senderPicture};
        //Receiver WebId
        const recipientPerson: Friend = {webid: this.ruta_seleccionada, name: this.getUserByUrl(this.ruta_seleccionada), picture: this.receiverPicture};
        const messageToSend: message = {content: messageContent, date: new Date(Date.now()), sender: senderPerson, recipient: recipientPerson};
        //console.log(messageToSend);

        const stringToChange = '/profile/card#me';
        const path = '/public/dechat1a/' + user + '/Conversation.txt';
        senderId = senderId.replace(stringToChange, path);
        const message = await this.readMessage(senderId);
        this.ruta = senderId;

        if (message != null) {
            this.updateTTL(senderId, message + '\n' + new TXTPrinter().getTXTDataFromMessage(messageToSend));
            if (this.messages.indexOf(message) !== -1) {
                this.messages.push(message);
                console.log('MESSAGES: ' + this.messages);
            }
        } else {
            this.updateTTL(senderId, new TXTPrinter().getTXTDataFromMessage(messageToSend));
        }
       // this.generateACL();
    }


    async getProfilePicture() {

        this.senderPicture = await this.rdf.getProfilePictureByUser(this.rdf.session.webId);
        this.receiverPicture = await this.rdf.getProfilePictureByUser(this.ruta_seleccionada);
        await this.senderPicture.replace("<", "");
        await this.senderPicture.replace(">", "");
        await this.receiverPicture.replace("<", "");
        await this.receiverPicture.replace(">", "");


        console.log("RECEIVER ROUTE             " + this.ruta_seleccionada);
        console.log("RECEIVER PICTURE         " + this.receiverPicture);

        console.log("SENDER ROUTE:          " + this.rdf.session.webId);
        console.log("SENDER PICTURE:          " + this.senderPicture);


    }


   /* private generateACL()
    {

        let user = this.getUserByUrl(this.ruta_seleccionada);
        let senderId = this.rdf.session.webId;

        const stringToChange = '/profile/card#me';
        const path = '/public/dechat1a/' + user;



        senderId = senderId.replace(stringToChange, path);
        var aclContents = this.ACLAux(senderId);

        senderId = senderId + '/Conversation.acl';
        console.log('SENDER ID:       ' + senderId);
        console.log('ACLContents:     ' + aclContents);
        this.fileClient.createFile(senderId, aclContents).then(200);
    }*/


   /* private ACLAux(ruta) {
        let partnerID = this.ruta_seleccionada.replace('#me', '#');
        let filename = "Conversation.txt"
       var ACL = "@prefix : <#>. \n"
            +"@prefix n0: <http://www.w3.org/ns/auth/acl#>. \n"
            +"@prefix c: </profile/card#>. \n"
            +"@prefix c0: <"+ partnerID + ">. \n\n"
            +":ControlReadWrite \n"
            +"\ta n0:Authorization; \n"
            +"\tn0:accessTo <"+ filename +">; \n"
            +"\tn0:agent c:me; \n"
            +"\tn0:mode n0:Control, n0:Read, n0:Write. \n"
            +":Read \n"
            +"\ta n0:Authorization; \n"
            +"\tn0:accessTo <"+ filename +">; \n"
            +"\tn0:agent c0:me; \n"
            +"\tn0:mode n0:Read.";

        var contenido =
            '@prefix  acl:  <http://www.w3.org/ns/auth/acl#> . \n' +
            '<#owner>\n' +
            'a             acl:Authorization;\n' +
            'acl:agent     <+ this.rdf.session.webId +>;\n' +
            'acl:accessTo  <+ ruta +>;\n' +
            'acl:mode\n      acl:Read,\n' +
            'acl:Write,\n' +
            'acl:Control.\n' +
            'acl:defaultForNew <./>;\n' +
            '<#reader>\n' +
            'a               acl:Authorization;\n' +
            'acl:accessTo  <+ ruta +>;\n' +
            'acl:mode        acl:Read;\n' +
            'acl:agent  <+ this.ruta_seleccionada +>.' +
            'acl:defaultForNew <./>;\n' ;
        console.log(contenido);
       return contenido;
    }*/
}


class TXTPrinter {
    public getTXTDataFromMessage(message) {
        return message.sender.webid + '###' +
            message.recipient.webid + '###' +
            message.content + '###' +
            message.date + '\n';
    }
}
