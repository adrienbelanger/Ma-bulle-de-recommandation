function navigate(url) {
  saveState();
  document.body.classList.add('fade-out');
  const dest = url + location.hash;
  document.body.addEventListener('animationend', () => window.location.href = dest, { once: true });
}


const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [],
  style: [
    { selector: 'node', style: {
        'label': 'data(label)',
        'text-valign': 'center', 'text-halign': 'center',
        'color': '#fff', 'width': 'label', 'height': 50,
        'background-color': '#666'
      }
    },
    { selector: '.decision', style: {
        'shape': 'diamond', 'background-color': '#4CAF50', 'padding': '30px'
      }
    },
    { selector: '.leaf', style: {
        'shape': 'roundrectangle', 'background-color': '#2196F3', 'padding': '10px'
      }
    },
    { selector: 'edge', style: {
        'width': 2, 'line-color': '#000', 'target-arrow-shape': 'triangle',
        'target-arrow-color': '#000', 'arrow-scale': 1.2, 'curve-style': 'bezier',
        'label': 'data(label)', 'text-margin-y': -10,
        'text-background-opacity': 1, 'text-background-color': '#fff',
        'text-background-shape': 'roundrectangle', 'text-background-padding': 2,
        'font-size': 12, 'text-rotation': 'autorotate'
      }
    }
  ],
  layout: { name: 'preset' }
});

let nextNodeId = 0, nextEdgeId = 0;
function saveState() {
  const snap = cy.elements().jsons().map(e => {
    const out = { group: e.group, data: { ...e.data } };
    if (e.group === 'nodes' && e.position) out.position = { ...e.position };
    if (e.classes && e.classes.length) out.classes = e.classes;
    return out;
  });
  const comp = LZString.compressToEncodedURIComponent(JSON.stringify(snap));
  history.replaceState(null, '', '#' + comp);
}
function loadState() {
  const h = location.hash.slice(1); if (!h) return;
  try {
    const arr = JSON.parse(LZString.decompressFromEncodedURIComponent(h));
    cy.elements().remove(); cy.add(arr);
    const nIds = cy.nodes().map(n => +n.id().slice(1)).filter(x=>!isNaN(x));
    const eIds = cy.edges().map(e => +e.id().slice(1)).filter(x=>!isNaN(x));
    nextNodeId = nIds.length ? Math.max(...nIds)+1 : 0;
    nextEdgeId = eIds.length ? Math.max(...eIds)+1 : 0;
  } catch(e) {}
}
window.addEventListener('popstate', loadState);
loadState();

function addNode(type) {
  const id = (type==='decision'? 'd' : 'l') + nextNodeId++;
  cy.add({ group: 'nodes', data: { id, label: type==='decision'? 'Décision':'Résultat' }, classes: type,
    position: { x:100+Math.random()*400, y:100+Math.random()*300 } });
  saveState();
}
document.getElementById('addDecision').onclick = () => addNode('decision');
document.getElementById('addLeaf').onclick     = () => addNode('leaf');


// Linking logic
let origin = null, target = null, dragging = false;
const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, 'svg');
svg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5');
const defs = document.createElementNS(svgNS, 'defs');
const marker = document.createElementNS(svgNS, 'marker');
marker.setAttribute('id','arrowHead'); marker.setAttribute('markerWidth','6');
marker.setAttribute('markerHeight','6'); marker.setAttribute('refX','0');
marker.setAttribute('refY','3'); marker.setAttribute('orient','auto');
const path = document.createElementNS(svgNS,'path');
path.setAttribute('d','M0,0 L0,6 L6,3 z'); path.setAttribute('fill','#000');
marker.appendChild(path); defs.appendChild(marker); svg.appendChild(defs);
const line = document.createElementNS(svgNS,'line');
line.setAttribute('id','previewLine'); line.setAttribute('stroke','#000');
line.setAttribute('stroke-width','2'); line.setAttribute('marker-end','url(#arrowHead)');
line.setAttribute('visibility','hidden'); svg.appendChild(line);
document.getElementById('cy').appendChild(svg);

cy.on('cxttapstart','node', evt => {
  origin = evt.target; dragging = false; target = null;
  const p = origin.renderedPosition();
  line.setAttribute('x1',p.x); line.setAttribute('y1',p.y);
  line.setAttribute('x2',p.x); line.setAttribute('y2',p.y);
  line.setAttribute('visibility','visible');
});
cy.on('cxtdrag', evt => {
  if (!origin) return; dragging = true;
  const rp = evt.renderedPosition; line.setAttribute('x2',rp.x); line.setAttribute('y2',rp.y);
});
cy.on('cxtdragover','node', evt => {
  if (dragging && evt.target.id()!==origin.id()) target = evt.target;
});
cy.on('cxtdragout','node', evt => {
  if (target && evt.target.id()===target.id()) target = null;
});
cy.on('cxttapend', () => {
  line.setAttribute('visibility','hidden');
  if (dragging && origin && target && origin.id()!==target.id()) {
    const cnt = cy.edges().filter(e => e.source().id()===origin.id()).length;
    const lbl = cnt===0 ? 'oui' : cnt===1 ? 'non' : '';
    cy.add({ group:'edges', data:{ id:'e'+nextEdgeId, source:origin.id(), target:target.id(), label:lbl } });
    nextEdgeId++; saveState();
  }
  origin = target = null; dragging = false;
});

// Inline editing
const labelEditor = document.getElementById('labelEditor'); let editing = null;
function showEditor(ele,pos,text){ editing=ele;
  labelEditor.value = text||'';
  labelEditor.style.left = pos.x + 'px'; labelEditor.style.top = pos.y + 'px';
  labelEditor.style.display = 'block'; labelEditor.focus(); labelEditor.select();
}
cy.on('dbltap','node', evt => showEditor(evt.target, evt.target.renderedPosition(), evt.target.data('label')));
cy.on('dbltap','edge', evt => {
  const e = evt.target, mid=e.midpoint(), z=cy.zoom(), pan=cy.pan();
  const pos={ x: mid.x*z+pan.x, y: mid.y*z+pan.y };
  showEditor(e,pos,e.data('label'));
});
labelEditor.addEventListener('keydown', e => { if(e.key==='Enter') commit(); else if(e.key==='Escape') cancel(); });
labelEditor.addEventListener('blur', commit);
function commit(){ if(editing && labelEditor.value.trim()){ editing.data('label',labelEditor.value.trim()); saveState(); }
  labelEditor.style.display='none'; editing=null; }
function cancel(){ labelEditor.style.display='none'; editing=null; }

// Delete via trash
let grab=null;
cy.on('grab','node', evt => grab=evt.target);
cy.on('drag', evt => {
  if(!grab) return;
  const rect= document.getElementById('trash').getBoundingClientRect();
  const cr=document.getElementById('cy').getBoundingClientRect();
  const p=evt.renderedPosition; const ax=cr.left+p.x, ay=cr.top+p.y;
  document.getElementById('trash').classList[ ax>=rect.left&&ax<=rect.right&&ay>=rect.top&&ay<=rect.bottom? 'add':'remove']('hovered');
});
cy.on('free','node', evt => {
  if(!grab) return;
  const rect= document.getElementById('trash').getBoundingClientRect();
  const cr=document.getElementById('cy').getBoundingClientRect();
  const p=evt.renderedPosition; const ax=cr.left+p.x, ay=cr.top+p.y;
  if(ax>=rect.left&&ax<=rect.right&&ay>=rect.top&&ay<=rect.bottom) {
    grab.connectedEdges().remove(); grab.remove();
  } else saveState();
  document.getElementById('trash').classList.remove('hovered'); grab=null;
});
