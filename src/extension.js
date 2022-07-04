// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const spawn = require("child_process").spawn;


let sml;
const smlOutput = vscode.window.createOutputChannel("SML");
let allowNextCommand;



/**
 * @param {vscode.ExtensionContext} context
 */


 //adapted from https://github.com/vrjuliao/sml-vscode-extension
 function start() {
     allowNextCommand = false;
     const cli = vscode.workspace.getConfiguration().get("sml-path", "sml");
 
     var cwd = {};
     if (vscode.workspace.workspaceFolders !== undefined) {
         var dir = vscode.workspace.workspaceFolders[0].uri.fsPath;
         cwd = { cwd: dir };
     } else {
         console.log("Unable to set working directory");
     }
     
     sml = spawn(cli, [], Object.assign({ shell: true }, cwd));
     
     sml.stdin.setEncoding("utf-8");
     sml.stdout.setEncoding("utf-8");
     sml.stderr.setEncoding("utf-8");
     console.log("started");
     sml.stdin.read(0);
 
     sml.on("error", function (err) {
         console.log(err);
         smlOutput.append(err.message);
     });
 
     sml.stderr.on("data", (data) => {
         smlOutput.show(false);
         smlOutput.append(data + `\n`);
         allowNextCommand = true;
     });
 
     sml.stdout.on("data", (data) => {
         smlOutput.show(false);
         smlOutput.append(data + `\n`);
     });
    smlOutput.show(false);
    
 }


 async function execCode(code) {
     while (!sml && !allowNextCommand) { ; }
 
     if (sml.exitCode === 0 || sml.exitCode)
         vscode.window.showErrorMessage("SML process died");
     else {
         try {
             allowNextCommand = false;
             sml.stdin.write(code + ";;;;\r\n");
         } catch (error) {
             smlOutput.append(error.message);
         }
     }
     await vscode.commands.executeCommand(
         "workbench.action.terminal.scrollToBottom"
     );
 }

 function restart() {
    if (sml.exitCode !== 0 && !sml.exitCode) {
        sml.stdin.end();
    }
    sml.kill();
    start();
 }
 
//runs the sources.cm file if exists
 async function runMake(filename="sources.cm") {
    const editor = vscode.window.activeTextEditor;
    restart()
    if (editor) {
        execCode(`CM.make "${filename}";`);
    }
 }
 
     
 function stop() {
    sml.stdin.end();
 }
 


 //saving basic keywords here
let smlTypes  = 'bool,int,real,string,char,word,list,ref,exn}'.split(',');
let smlKeywords = 'andalso,and,as,abstype,eqtype,datatype,do,div,handle,LESS,GREATER,EQUAL,int,string,case,orelse,else,end,exception,false,fun,functor,if,in,infix,infixr,include,match,method,mod,mutable,NONE,not,nonfix,nil,of,op,open,raise,rec,ref,sig,struct,signature,sharing,SOME,then,to,true,try,type,val,when,where,while,with,withtype'.split(',');
let reservedModule = 'eqtype,functor,include,sharing,sig,signature,struct,structure,where,:>'.split(',');

function activate(context) {

    start();

	console.log('Congratulations, your extension "SMLunity" is now active!');

    let toVsPos = (pos) => {
        return new vscode.Position(pos.line - 1, pos.col);
    };
    let fromVsPos = (pos) => {
        return { line: pos.line + 1, col: pos.character };
    };
    let toVsRange = (start, end) => {
        return new vscode.Range(toVsPos(start), toVsPos(end));
    };

	let runmake = vscode.commands.registerCommand('runMake', 
        () => runMake("sources.cm"));
	let restartRepl = vscode.commands.registerCommand('restart', 
        () => restart());

	context.subscriptions.push(runmake);
	context.subscriptions.push(restartRepl);	


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



    context.subscriptions.push(
        vscode.languages.setLanguageConfiguration({language:'sml'}, {
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
    
                if (word == "and" || word == "&" || word == "&&") {
                    return new vscode.Hover({
                        language: "sml",
                        value: "Maybe 'andalso'?"
                    });
                }
                if (word == "or" || word == "||" || word == "|") {
                    return new vscode.Hover({
                        language: "sml",
                        value: "Maybe 'or'?"
                    });
                }
                if (word == "-") {
                    return new vscode.Hover({
                        language: "sml",
                        value: "Maybe '~'?"
                    });
                }
                if (word == "yay"){
                    return vscode.window.showErrorMessage('Wrong!');
                }
                if (word == ":>"){
                    return new vscode.Hover({
                        language: "sml",
                        value: "Opaque signature ascription"
                    });          
                }
            }
        })
    );

}

//exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	stop();
}



module.exports = {
	activate,
	deactivate
}

/* Notes: made snippets in snippets/snip.json, must be checked for usability
*/