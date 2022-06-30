// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
//https://github.com/vrjuliao/sml-vscode-extension
const smlEnviron = require('./smlEnvironmentManager');
//import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

let smlKeywords = 'andalso|as|class|do|LESS|GREATER|EQUAL|int|string|case|orelse|else|end|exception|false|fun|functor|if|in|include|let|match|method|module|mutable|of|open|rec|sig|struct|signature|then|to|true|try|type|val|when|with'.split('|');

function activate(context) {
	//smlEnviron.start();
	console.log('Congratulations, your extension "SMLunity" is now active!');
	let disposable = vscode.commands.registerCommand('smunity.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from SMLunity!');
	});

	context.subscriptions.push(disposable);

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
			{language: "sml"}, {
            async provideCompletionItems(document, position, token) {
                return new vscode.CompletionList(smlKeywords.map((keyword) => {
                    let completionItem = new vscode.CompletionItem(keyword);
                    completionItem.kind = vscode.CompletionItemKind.Keyword;
                    return completionItem;
                }));
            }
        })
    );

}

//exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	//smlEnviron.stop();
}

module.exports = {
	activate,
	deactivate
}