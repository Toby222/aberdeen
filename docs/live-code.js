// This script augments javascript examples in the documentation
// to allow editing and running them in a live preview.
// You may consider all of this to be a bit hacky. :-)

let styleE = document.createElement('style');
styleE.innerText = `
iframe {
    width: 100%;
    border: none;
}
.console-output {
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
}
.console-output > .error { color: #faa; }
.console-output > .info { color: #afa; font-weight: bold; }
.console-output > .debug { color: #ccc; }


.tabs {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
}

.tab {
    padding: 1rem 2rem;
    cursor: pointer;
    color: var(--color-text);
    transition: background-color 0.2s;
}

.tab.special {
    color: var(--color-link);
    font-style: italic;
}

.tab.active {
    background-color: var(--color-background-secondary);
    border-bottom: 4px solid var(--color-focus-outline);
}

.tab:hover {
    background-color: var(--color-background-active);
}

.tab-content {
    background-color: var(--color-background);
    border: 1px solid #9096a2;
    border-top-color: var(--color-focus-outline);
}

.tab-content > pre {
    border-radius: 0;
    border: 0;
    margin: 0;
}
`;
document.head.appendChild(styleE);

const iframeStyle = `
html, body {
    overflow: hidden;
}
* {
    box-sizing: border-box;    
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
}
:root {
    --link-color: #4c97f2;
    --text-color: #f5f5f5;
    --secondary-color: #bebe00;
    --neutral-color: #ccc;
}
body {
    padding: 0.8em;
    background-color: #1e1e1e;
    color: var(--text-color);
    font-size: 16px;
}
button {
    background-color: var(--link-color);
    font-weight: bold;
    color: white;
    border: none;
    padding: 0.5em 1em;
    border-radius: 4px;
    cursor: pointer; 
    border: 2px solid var(--link-color);
}
.secondary {
    background-color: var(--secondary-color);
    border: 2px solid var(--secondary-color);
    color: black;
}
.outline {
    background-color: transparent;
    color: inherit;
}
.box {
    box-shadow: 0 0 5px var(--link-color);
    padding: 1em;
    border: 1px solid var(--link-color);
    border-radius: 8px;
    overflow: auto;
}
input {
    padding: 0.5em 0.75em;
    border-radius: 4px;
    outline: none;
    background-color: white;
    border: 2px solid white;
    width: 100%;
    margin: 0;
}
input:focus {
    border-color: var(--link-color);
}
.row {
    display: flex;
    gap: 0.5em;
}
.row.wide > * {
    flex: 1;
}
label {
    display: flex;
    gap: 0.5em;
    padding: 0.5em 0;
    cursor: pointer;
}
input[type="checkbox"] {
    width: initial;
}
p {
    margin: 0;
}
p + p {
    margin-top: 0.5em;
}
h1:first-child,h2:first-child,h3:first-child,h4:first-child,h5:first-child,h6:first-child {
    margin-top: 0;
}
`;

let iframeCount = 0;

function iframeCode(iframeId) {
    function update() {
        const height = document.documentElement.offsetHeight;
        window.parent.postMessage({ height, iframeId, html: getHtml(document.body) }, '*');
    }

    // Request by parent for an update (when the iframe becomes visible)
    addEventListener('message', update);
    
    function toLogString(val, maxDepth = 3, indent = "", seen = new WeakMap()) {
        if (val === null) return "null";
        if (val === undefined) return "undefined";
        if (typeof val === "string") return JSON.stringify(val);
        if (typeof val === "function") return 'function' + (val.name ? ' '+val.name : '');
        if (typeof val !== "object") return String(val);
        if (val instanceof Date) return val.toISOString();
        if (val instanceof RegExp) return String(val);
        if (val instanceof Error) return (val.stack || val.message).replace(/\n/g, "\n  " + indent);
        
        if (seen.has(val)) return "<Circular>";
        seen.set(val, true);

        const newIndent = indent + '  ';

        if (Array.isArray(val)) {
            if (!maxDepth) return "[...]";
            const items = val.map(item => toLogString(item, maxDepth - 1, newIndent, seen)).join('');
            return `[\n${items}${indent}]`;
        }
        
        const name = val.constructor.name || '';
        if (name === 'Object') name = '';
        if (!maxDepth) return `${name}{...}`;
        const props = Object.entries(val).map(([key, val]) => `${newIndent}${key}: ${toLogString(val, maxDepth - 1, newIndent, seen)}\n`).join('');
        return `${name}{\n${props}${indent}}`
    }
    
    function createLogFunction(level) {
        return (...args) => window.parent.postMessage({
            level,
            log: args.map(arg => toLogString(arg)).join(" "),
            iframeId,
        }, '*');
    }
    
    window.console = {
        log: createLogFunction('log'),
        error: createLogFunction('error'),
        info: createLogFunction('info'),
        debug: createLogFunction('debug')
    };
    
    // Catch unhandled errors
    window.onerror = (message, source, lineno, colno, error) => {
        console.error(message);
        return false;
    };
    
    // Catch unhandled promise rejections
    window.onunhandledrejection = (event) => {
        console.error('Unhandled Promise rejection:', event.reason);
    };
    
    document.addEventListener('DOMContentLoaded', () => {
        new MutationObserver(update).observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        update();
    });
    
    function getHtml(element, indent='') {
        let output = '';
        for (const child of element.childNodes) {
            if (!child.children?.length) {
                output += indent + ('outerHTML' in child ? child.outerHTML : child.textContent) + "\n";
            } else {
                const outerHTML = child.cloneNode(false).outerHTML;
                
                let openClose = outerHTML.split('></');
                output += indent + openClose[0] + '>\n';
                output += getHtml(child, indent+'  ');
                output += indent + '</' + openClose[1] + "\n";
            }
        }        
        return output;
    }
}

addEventListener('DOMContentLoaded', () => {
    for(let codeE of document.querySelectorAll('code[class="javascript"]')) {
        const preE = codeE.parentElement;
        if (preE.tagName !== 'PRE') continue;
        let js = '';
        for(let wordE of codeE.children) {
            if (wordE.tagName==='BR') js += "\n";
            else js += wordE.textContent;
        }
        
        const base = document.body.parentElement.getAttribute('data-base') || '/';
        const absBase = new URL(base, window.location.href).href;
        
        // Check for Aberdeen imports
        const orgJs = js;
        js = js.replace(/from\s+['"]aberdeen(\/[^'"]+)?['"]/g, 
            (match, subpath) => `from "${absBase}assets/aberdeen${subpath || '/aberdeen'}.js"`
        );
        if (js === orgJs) {
            // No imports have been done, do our default input
            js = `import {$,clean,clone,copy,countProps,DOM_READ_PHASE,DOM_WRITE_PHASE,dump,getParentElement,immediateObserve,insertCss,invertString,isEmpty,map,MERGE,mount,multiMap,observe,onEach,partition,peek,proxy,ref,runQueue,setErrorHandler,SHALLOW,unmountAll,unproxy} from "${absBase}assets/aberdeen/aberdeen.js";\n\n` + js;
        }
        
        // Create edit button
        const editButtonE = document.createElement('button');
        editButtonE.className = 'button';
        editButtonE.textContent = 'Edit';
        editButtonE.style.marginRight = '58px'; // Leave room for Copy button - hacky!
        editButtonE.addEventListener('click', () => {
            preE.innerHTML = '';
            let reloadTimeout = null;
            loadEditor(preE, js, (newJs) => {
                js = newJs;
                clearTimeout(reloadTimeout);
                reloadTimeout = setTimeout(reloadIframe, 250);
            });
        });
        preE.appendChild(editButtonE);
        
        
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        const iframeE = document.createElement('iframe');
        const iframeId = ++iframeCount;
        iframeE.id = iframeId;
        
        const messageHandler = (e) => {
            if (e.data.iframeId == iframeId) {
                if (e.data.height) {
                    iframeE.style.height = e.data.height + 'px';
                }
                if (e.data.html) {
                    htmlE.innerText = e.data.html.trim();
                }
                if (e.data.level) {
                    const msg = document.createElement('li');
                    msg.className = e.data.level;
                    msg.textContent = e.data.log;
                    consoleE.appendChild(msg);
                    consoleE.scrollTop = consoleE.scrollHeight;
                    tabs.Console.tabE.innerHTML = `Console <code class="tsd-tag">${consoleE.childElementCount}</code>`;
                    if (e.data.level === 'error' && currentMode !== 'Console') {
                        let oldMode = currentMode;
                        tabs.Console.select();
                        autoBackMode = oldMode;
                    }
                }
            }
        };
        addEventListener('message', messageHandler);
        
        // Create console output div
        const consoleE = document.createElement('pre');
        consoleE.className = 'console-output';
        
        const htmlE = document.createElement('pre');
        
        const tabsE = document.createElement('ul');
        tabsE.className = 'tabs';
        
        let autoBackMode;
        let currentMode;
        
        let tabs = {};
        for(let [name, contentE] of Object.entries({Browser: iframeE, HTML: htmlE, Console: consoleE})) {
            tabContent.appendChild(contentE);
            const tabE = document.createElement('li');
            tabE.className = 'tab';
            tabE.textContent = name;
            
            const select = () => {
                currentMode = name;
                autoBackMode = undefined;
                for(let tabPane of tabContent.children) {
                    tabPane.style.display = 'none';
                }
                contentE.style.display = 'block';
                for(let t of tabsE.children) {
                    t.classList.remove('active');
                }
                tabE.classList.add('active');
                if (contentE === iframeE && iframeE.contentWindow) iframeE.contentWindow.postMessage({}, '*'); // Request a height update
            };
            tabE.addEventListener('click', select);
            
            tabsE.appendChild(tabE);
            tabs[name] = {select, tabE};
        }
        
        let hasLayout = !!js.match(/\$\(\s*['"`]/);
        let hasInteraction = !!js.match(/\bbind:|\bclick:|\binput:|\bsetInterval\b|\bsetTimeout\b/);
        tabs[hasLayout ? (hasInteraction ? 'Browser' : 'HTML') : 'Console'].select();
        
        reloadIframe();
        
        const restartTabE = document.createElement('a');
        restartTabE.className = 'tab special';
        restartTabE.textContent = 'Restart';
        restartTabE.addEventListener('click', () => {
            reloadIframe();
        });
        
        tabsE.appendChild(restartTabE);
        
        preE.after(tabContent);
        preE.after(tabsE)
        
        function reloadIframe() {
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>${iframeStyle}</style>
    <script>
        (${iframeCode.toString()})(${iframeId});
    </script>
    <script type="module">
        ${js}
    </script>
</head>
<body>
</body>
</html>`;
            URL.revokeObjectURL(iframeE.src);
            iframeE.src = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
            consoleE.innerHTML = '';
            htmlE.innerHTML = '';
            tabs.Console.tabE.innerHTML = `Console`;
            
            if (autoBackMode) tabs[autoBackMode].select();
        }
    }
    
})
async function loadEditor(preE, js, onChange) {
    if (!window.monaco) {
        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
        
        await new Promise(resolve => {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }});
            require(['vs/editor/editor.main'], resolve);
        });
    }
    
    // Create container
    const container = document.createElement('div');
    preE.appendChild(container);
    
    // Create editor
    const editor = monaco.editor.create(container, {
        value: js,
        language: 'javascript',
        theme: 'vs-dark',
        minimap: {
            enabled: false
        },
        scrollBeyondLastLine: false,
        scrollbar: {
            vertical: 'hidden',
            verticalScrollbarSize: 0,
            alwaysConsumeMouseWheel: false,
        },
        lineNumbers: "off",
    });
    editor.onDidContentSizeChange(() => {
        const height = editor.getContentHeight();
        editor.layout({ width: editor.getLayoutInfo().width, height });
    });
    
    // Add change handler
    if (onChange) {
        editor.onDidChangeModelContent(() => {
            onChange(editor.getValue());
        });
    }
    
    return editor;
}