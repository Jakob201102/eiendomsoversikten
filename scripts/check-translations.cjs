const fs=require('fs'),path=require('path'),ts=require('typescript'),vm=require('vm');
const root=path.resolve(__dirname,'..'),out={exports:{}};
const dictSource=fs.readFileSync(path.join(root,'app/lib/translations-en.ts'),'utf8');
vm.runInNewContext(ts.transpileModule(dictSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,out);
const english=out.exports.english,missing=[];
function check(text,file,line){text=text.trim();if(!text||!/[A-Za-zÆØÅæøå]/.test(text)||/^https?:|^mailto:|^image\/|^application\//.test(text))return;if(!Object.hasOwn(english,text)||!english[text]?.trim())missing.push(`${file}:${line}: missing English translation: ${JSON.stringify(text)}`);}
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else if(/\.tsx?$/.test(f)&&!f.endsWith('translations-en.ts')){const s=fs.readFileSync(f,'utf8'),a=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),rel=path.relative(root,f);function visit(n){let text;
 if(ts.isCallExpression(n)&&['uiText','uiFormat','setFeil','setFeilmelding','setMelding'].includes(n.expression.getText(a))&&n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0]))text=n.arguments[0].text;
 if(ts.isJsxAttribute(n)&&n.name.text==='text'&&n.initializer&&ts.isStringLiteral(n.initializer))text=n.initializer.text;
 if(text!==undefined)check(text,rel,a.getLineAndCharacterOfPosition(n.getStart(a)).line+1);
 ts.forEachChild(n,visit);}visit(a);}}}walk(path.join(root,'app'));
if(missing.length){console.error([...new Set(missing)].join('\n'));process.exit(1);}console.log('PASS: exact-case English keys for marked UI text, format templates and literal status messages. User-entered text and addresses are preserved.');
