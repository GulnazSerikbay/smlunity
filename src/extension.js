// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
//https://github.com/vrjuliao/sml-vscode-extension
const smlEnviron = require('./smlEnvironmentManager');
//import * as vscode from 'vscode';

/**
 * @param {vscode.ExtensionContext} context
 */



 let getStream = require('get-stream');

 let configuration = vscode.workspace.getConfiguration("sml");
 
 //below is copied code from ocaml extension
 let doOcpIndent = async (document, token, range) => {
	 let code = document.getText();
	 let ocpIndentPath = configuration.get<string>('ocpIndentPath');
	 let cmd = [ocpIndentPath];
	 if (range) {
		 cmd.push('--lines');
		 cmd.push(`${range.start.line + 1}-${range.end.line + 1}`);
	 }
	 cmd.push('--numeric');
	 let cp = await opamSpawn(cmd, {
		 cwd: Path.dirname(document.fileName)
	 });
 
	 token.onCancellationRequested(() => {
		 cp.disconnect();
	 });
 
	 cp.stdin.write(code);
	 cp.stdin.end();
 
	 let output = await getStream(cp.stdout);
	 cp.unref();
	 if (token.isCancellationRequested) return null;
 
	 let newIndents = output.trim().split(/\n/g).map((n) => +n);
	 let oldIndents = code.split(/\n/g).map((line) => /^\s*/.exec(line)[0]);
 
	 let edits = [];
	 let beginLine = range ? range.start.line : 0;
	 newIndents.forEach((indent, index) => {
		 let line = beginLine + index;
		 let oldIndent = oldIndents[line];
		 let newIndent = ' '.repeat(indent);
		 if (oldIndent !== newIndent) {
			 edits.push(vscode.TextEdit.replace(
				 new vscode.Range(
					 new vscode.Position(line, 0),
					 new vscode.Position(line, oldIndent.length)
				 ),
				 newIndent)
			 );
		 }
	 });
 
	 return edits;
 };

 //saving basic keywords here
let smlTypes  = 'bool,int,real,string,char,word,list,ref,exn}'.split(',');
let smlKeywords = 'andalso,and,as,abstype,eqtype,datatype,do,div,handle,LESS,GREATER,EQUAL,int,string,case,orelse,else,end,exception,false,fun,functor,if,in,infix,infixr,include,match,method,mod,mutable,NONE,not,nonfix,nil,of,op,open,raise,rec,ref,sig,struct,signature,sharing,SOME,then,to,true,try,type,val,when,where,while,with,withtype'.split(',');
let reservedModule = 'eqtype,functor,include,sharing,sig,signature,struct,structure,where,:>'.split(',');

function activate(context) {
	//smlEnviron.start();
	console.log('Congratulations, your extension "SMLunity" is now active!');
	let disposable = vscode.commands.registerCommand('smunity.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from SMLunity!');
	});

	context.subscriptions.push(disposable);


	// autocompletion for basic SML keywords
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
			{language: "sml"}, {
            async provideCompletionItems(document, position, token) {
                return new vscode.CompletionList(
                    smlKeywords.map((word) => {
                        let completionItem = new vscode.CompletionItem(word);
                        completionItem.kind = vscode.CompletionItemKind.Keyword;
                        return completionItem;
                }));
            }
        })
    );

    //below is for autocompletion, copied code from ocaml extension
	context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({language: 'sml'}, {
            async provideCompletionItems(document, position, token) {
                let line = document.getText(new vscode.Range(
                    new vscode.Position(position.line, 0),
                    position
                ));
                let match = /(?:[~?]?[A-Za-z_0-9'`.]+)$/.exec(line);
                let prefix = match && match[0] || '';

                await session.syncBuffer(document.fileName, document.getText(), token);
                if (token.isCancellationRequested) return null;

                let [status, result] = await session.request(['complete', 'prefix', prefix, 'at', fromVsPos(position), 'with', 'doc']);
                if (token.isCancellationRequested) return null;

                if (status !== 'return') return;

                return new vscode.CompletionList(
                    result.entries.map(({name, kind, desc, info}) => {
                        let completionItem = new vscode.CompletionItem(name);
                        let toVsKind = (kind) => {
                            switch (kind.toLowerCase()) {
                                case "value": return vscode.CompletionItemKind.Value;
                                case "variant": return vscode.CompletionItemKind.Enum;
                                case "constructor": return vscode.CompletionItemKind.Constructor;
                                case "label": return vscode.CompletionItemKind.Field;
                                case "module": return vscode.CompletionItemKind.Module;
                                case "signature": return vscode.CompletionItemKind.Interface;
                                case "type": return vscode.CompletionItemKind.Class;
                                case "method": return vscode.CompletionItemKind.Function;
                                case "#": return vscode.CompletionItemKind.Method;
                                case "exn": return vscode.CompletionItemKind.Constructor;
                                case "class": return vscode.CompletionItemKind.Class;
                            }
                    };

                    completionItem.kind = toVsKind(kind);
                    completionItem.detail = desc;
                    completionItem.documentation = info;
                    if (prefix.startsWith('#') && name.startsWith(prefix)) {
                        completionItem.textEdit = new vscode.TextEdit(
                            new vscode.Range(
                                new vscode.Position(position.line, position.character - prefix.length),
                                position
                            ),
                            name
                        );
                    }
                    return completionItem;
                }));
            }
        }, '.', '#'));

    context.subscriptions.push(
        vscode.languages.setLanguageConfiguration('sml', {
            indentationRules: {
                increaseIndentPattern: /^\s*(type|let)\s[^=]*=\s*$|\b(do|fun|struct|sig)\s*$/,
                decreaseIndentPattern: /\b(end)\s*$/,
            }
        })
    );

    // learning to do hovers, for now error checking for 'and'(must be 'andalso')
    context.subscriptions.push(
        vscode.languages.registerHoverProvider("sml", {
            async provideHover(document, position, token) {
                const range = document.getWordRangeAtPosition(position);
                const word = document.getText(range);
    
                if (word == "and") {
                    return new vscode.Hover({
                        language: "Hello language",
                        value: "Maybe 'andalso'?"
                    });
                }
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

/* Notes: made snippets in snippets/snip.json, must be checked for usability
*/