// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs'; // Import the 'fs' module
import * as os from 'os';

const lwcFolderPath = os.platform() === 'win32' ? '\\force-app\\main\\default\\classes\\' : '/force-app/main/default/classes/';
const pathSeparator = os.platform() === 'win32' ? '\\': '/'; 

class ApexDocObject{
	name: String;
	parameters: ApexDocParameter[] = [];
	constructor(name:String){
		this.name = name;
	}
}

class ApexDocParameter{
	name: String;
	value: String;
	constructor(name: String, value: String){
		this.name = name; 
		this.value = value;
	}
}

class TreeClassNode{
	className: String;
	constructor(className:String){
		this.className = className;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	lwcFolderPath;
	pathSeparator;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "apex-dev-buddy" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('apex-dev-buddy.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World from apex-dev-buddy!');
		const panel = vscode.window.createWebviewPanel(
			'apexDocWebview', // Identifies the type of the webview. Used internally
			'ApexDoc by Buddy', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{enableScripts: true} // Webview options. More on these later.
		  );

		  //panel.webview.html
		getWebviewContent(context).then(res => {
			panel.webview.html = res;
		  });

		  panel.webview.postMessage({message:"test"});

		  panel.webview.onDidReceiveMessage(
			async message => {
				console.log(message);
				var apexDoxReturn;
				createApexDocByClassName(message.message).then(res => {
					apexDoxReturn = res;
					panel.webview.postMessage({command: apexDoxReturn});
				});
			}
		  );
	});
	context.subscriptions.push(disposable);

	let clearEmptyLine = vscode.commands.registerCommand('apex-dev-buddy.clearEmptyLineClasses', () =>{

		const panel = vscode.window.createWebviewPanel(
			'apexDocWebview', // Identifies the type of the webview. Used internally
			'Clear Empty Lines by Dev Buddy', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{	
				enableScripts: true,
				retainContextWhenHidden :true
			} // Webview options. More on these later.
		);

		let emptyLinesResult;
		panel.webview.html = getWebviewContentLoading();
		
		panel.webview.html = getWebviewContentForCleanEmptyLines('N/A');
/* 
		getQuantityOfEmptyLines().then(res => {
			emptyLinesResult = res;
			panel.webview.html = getWebviewContentForCleanEmptyLines(String(res));
		}); */


		

		panel.webview.onDidReceiveMessage(
			async message => {
				console.log(message);
				var emptyLinesResult;
				if(message.message === 'clearChar'){
					clearEmptyLines().then(res => {
						emptyLinesResult = res;
						//getWebviewContentForCleanEmptyLines(String(emptyLinesResult));
						panel.webview.postMessage({qttClearedChar: res});
					});	
				} else if(message.message === 'getQuantity'){
					getQuantityOfEmptyLines().then(res => {
						panel.webview.postMessage({qttCharacters: res});
					});
				}
			}
			);

	});

	context.subscriptions.push(clearEmptyLine);
}

async function getQuantityOfEmptyLines() {

	const files = await vscode.workspace.findFiles('**'+lwcFolderPath+'**.{cls}');
	let quantityOfCharacteresCleaned = 0;
	for (const file of files) {
		const fileContent = fs.readFileSync(file.fsPath, 'utf-8');
		const contentSplitByLine = fileContent.split('\n');

		for(var line = 0; line < contentSplitByLine.length ; line++){
			const contentLength = contentSplitByLine[line].length;
			const contentTrimmed = contentSplitByLine[line].trimEnd();
			quantityOfCharacteresCleaned = quantityOfCharacteresCleaned + (contentLength - contentTrimmed.length);
		}
	}
	return quantityOfCharacteresCleaned;

}

async function clearEmptyLines() {

	const files = await vscode.workspace.findFiles('**\\classes\\*DataFactory.{cls}');

	let quantityOfCharacteresCleaned = 0;
	for (const file of files) {

		const fileContent = fs.readFileSync(file.fsPath, 'utf-8');
		//const fileContent = new TextDecoder().decode(fileContentBuffer);
		const contentSplitByLine = fileContent.split('\n');
		let newFileClean = '';
		for(var line = 0; line < contentSplitByLine.length ; line++){
			const contentLength = contentSplitByLine[line].length;
			const contentTrimmed = contentSplitByLine[line].trimEnd();
			newFileClean += contentTrimmed+'\n';
			quantityOfCharacteresCleaned = quantityOfCharacteresCleaned + (contentLength - contentTrimmed.length);
		}

		

		
		// 2. Perform your modification (example: add a line at the beginning)
		//const modifiedContent = `// Modified by Clear Empty Line\n//CharacteresCleaned: ${quantityOfCharacteresCleaned}\n${newFileClean}`;
		const modifiedContent = newFileClean;
		
		// 3. Write the modified content back to the file
		await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(modifiedContent));
	}

	return quantityOfCharacteresCleaned;
	
}

async function loadClassesTree(){
	const classAccess = ['private', 'public', 'global'];
	//[virtual | abstract | with sharing | without sharing] 
	//class classe
	/* 
	private | public | global 
	[virtual | abstract | with sharing | without sharing] 
	class ClassName [implements InterfaceNameList] [extends ClassName] 
	{ 
	// The body of the class
	}
	*/
	
	const apexClassesList: TreeClassNode[] = [];
	
	const files = await vscode.workspace.findFiles('**\\classes\\**.{cls}');


	
	for (const file of files) {
		const fileName = path.basename(file.fsPath,'.cls');

		apexClassesList.push(new TreeClassNode(fileName));
		
	}
	
	return apexClassesList;

}

async function createApexDocByClassName(className: String){

	const files = await vscode.workspace.findFiles('**\\classes\\*'+className+'.{cls}');
	var headerBlockList;

	for (const file of files) {

		var startLine = 0;
		const content = fs.readFileSync(file.fsPath, 'utf8');
		console.log(content);
		const contentLine = content.split('\n');
		const totalLenght = contentLine.length;

		
		var commentStartLine = null;
		var commentEndLine = null;
		var blockCommentContent = '';

		const apexDocObj = new ApexDocObject(file.path);
		for(var i=0 ; i <= contentLine.length ; i++ ){
			if(commentStartLine !== null && commentEndLine !== null){

				var isCommentBlock = false;
				for(var additionalLine = 0; additionalLine <= 2; additionalLine++){
					if(contentLine[commentEndLine + additionalLine]){
						isCommentBlock = contentLine[commentEndLine + additionalLine].includes('private ') || contentLine[commentEndLine + additionalLine].includes('public ') || contentLine[commentEndLine + additionalLine].includes('global ');
					}
				}
				if(isCommentBlock){
					headerBlockList = createApexDocObject(apexDocObj, blockCommentContent);
					commentStartLine = commentEndLine = null; 
				} else {
					commentStartLine = commentEndLine = null; 
					blockCommentContent = '';
				}
			}
			
			if(contentLine[i] === '/**'){
				commentStartLine = i;
			}
			if(contentLine[i] === '*/'){
				commentEndLine = i;
			}
			if(commentStartLine !== null){
				blockCommentContent = blockCommentContent === '' ? contentLine[i] : blockCommentContent + '\n' +contentLine[i];
			}
		}
		
	}

	return headerBlockList;

}

function createApexDocObject(apexDocObj: ApexDocObject, commentBlockContent: String){
	const commentBlockSplited = commentBlockContent.split('\n');

	for(var i = 0; i < commentBlockSplited.length; i++){
		var paramName = commentBlockSplited[i].split('@')[1];
		if(paramName){
			paramName = paramName.split(':')[0].trimEnd();
		}

		var paramValue = commentBlockSplited[i].split(':')[1];
		if(paramValue){
			paramValue = paramValue.trimStart().trimEnd();
		}
		
		if(paramName && paramValue){

			var param = new ApexDocParameter(paramName, paramValue);	
			apexDocObj.parameters.push(param);
		}
	}
	return apexDocObj;

}

function buildFirstNode(className: String){
	return '<li class="parent"><span>'+ className +'</span></li>';
}

async function getWebviewContent(context: vscode.ExtensionContext) :Promise<string> {

	const htmlFilePath = path.join(context.extensionPath, 'src/html', 'index.html');

	var htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
	/* const classesTree = loadClassesTree();
	htmlContent = htmlContent.replace('{treeClasses}', JSON.stringify(classesTree));

	return htmlContent; */
	return new Promise(resolve => {
			var treeGripBuilt = '';

			loadClassesTree().then(res => {
				if(res.length > 0){
					for (let i = 0; i < res.length; i++) {
						//const classNode = res[i];
						treeGripBuilt += buildFirstNode(res[i].className);
						//<li class="parent"><span></span></li>
					}
				}
				htmlContent = htmlContent.replace('{treeClasses}', treeGripBuilt);
				resolve(htmlContent);
			});
		}
	);
	/* loadClassesTree().then(result =>{
		//var htmlContent = fs.readFileSync(htmlFilePath, 'utf8', 'utf-8');
		htmlContent = htmlContent.replace('{treeClasses}', JSON.stringify(result));

		//return htmlContent;
	}).catch(error => {
		//return null;
	}).finally(() =>{
		//return htmlContent;
	});

	return htmlContent; */


	//.replace('{treeClasses}', JSON.stringify(classesTree));
	

	/* return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Cat Coding</title>
  </head>
  <body>
  <h1>Hello World!</h1>
	  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
  </body>
  <script>
	console.log('teste will');
  </script>
  </html>`; */
  }

function getWebviewContentForCleanEmptyLines(emptyLinesQuantity : string) :string {
	return `<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
				.loader {
					border: 16px solid #f3f3f3; /* Light grey */
					border-top: 16px solid #3498db; /* Blue */
					border-radius: 50%;
					width: 120px;
					height: 120px;
					animation: spin 2s linear infinite;
				}

				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			</style>
			</head>
			<body>
			<h1>Welcome to Clear Empty Lines by Dev Buddy!</h1>
				<div class="loader" style="display:none"></div>
				<p>Quantity of Character to be cleaned: <p class="emptyLineQtt">${emptyLinesQuantity}</p></p>
				<button class="btnClass" type="button" onclick="sendMessageToExt('getQuantity')";">Get quantity of Characters!</button>
				<br><br>
				<p>Quantity of Character removed: <p class="clearedLinesQtt">${emptyLinesQuantity}</p></p>
				<button class="btnClass" type="button" onclick="sendMessageToExt('clearChar')";" disabled>Clear Characters!</button>
			</body>
			<script>
				const vscode = acquireVsCodeApi();
				function sendMessageToExt(message){
					const allButtons = document.querySelectorAll('.btnClass');
					allButtons.forEach(btn => {
						btn.disabled = true;
					});
					vscode.postMessage({ message: message });
				}

				window.addEventListener('message', event => {
            		const message = event.data;
					console.log(event.data);
					if(message.qttClearedChar){
						const clearedLineQtt = document.querySelector('.clearedLinesQtt');
						clearedLineQtt.textContent = message.qttClearedChar;
					} else if (message.qttCharacters){
						const emptyLineQtt = document.querySelector('.emptyLineQtt');
						emptyLineQtt.textContent = message.qttCharacters;
					}
					const allButtons = document.querySelectorAll('.btnClass');
					allButtons.forEach(btn => {
						btn.disabled = false;
					});

				});
			</script>
			</html><h1>`;
  }

  function getWebviewContentLoading(){
	return `<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<style>
				.loader {
					border: 16px solid #f3f3f3; /* Light grey */
					border-top: 16px solid #3498db; /* Blue */
					border-radius: 50%;
					width: 120px;
					height: 120px;
					animation: spin 2s linear infinite;
				}

				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			</style>
			</head>
			<body>
			<h1>Clear Empty Lines by Dev Buddy!</h1>
				<div class="loader" style="display:none"></div>
			</body>
			</html>`;
  }

// This method is called when your extension is deactivated
export function deactivate() {}
