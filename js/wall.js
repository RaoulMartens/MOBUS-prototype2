// Establish BroadcastChannel for local cross-tab communication
const channel = new BroadcastChannel('mobus-session');

// DOM Elements
const trunkEl = document.getElementById('wall-trunk');
const branchesContainer = document.getElementById('wall-branches');
const leavesContainer = document.getElementById('wall-leaves');
const titleEl = document.getElementById('wall-session-title');
const statusTextEl = document.getElementById('wall-status-text');
const ideasStatEl = document.getElementById('wall-stat-ideas');
const groupsStatEl = document.getElementById('wall-stat-groups');
const particlesContainer = document.getElementById('particles');

// State Cache
let currentState = {
  totalIdeas: 0,
  soloIdeasCount: 0,
  groups: [],
  sessionTitle: 'Creatieve Speelruimte',
  activeState: 'welcome'
};

// Initialize Background Particles
function initParticles() {
  if (!particlesContainer) return;
  particlesContainer.innerHTML = '';
  
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'ambient-leaf';
    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `${Math.random() * 100}vh`;
    p.style.opacity = `${Math.random() * 0.4 + 0.1}`;
    p.style.scale = `${Math.random() * 0.6 + 0.4}`;
    
    // Custom drift animation duration & delay
    p.style.animationDuration = `${Math.random() * 12 + 8}s`;
    p.style.animationDelay = `${Math.random() * -10}s`;
    
    particlesContainer.appendChild(p);
  }
}

// Redraw Tree based on tabletop data
function updateTree() {
  const { totalIdeas, soloIdeasCount, groups } = currentState;
  
  // 1. Calculate Trunk parameters
  // Growth height starts at 50px, goes up to 160px
  const baseTrunkHeight = 50;
  const maxGrowthHeight = 110;
  const growthFactor = Math.min(1.0, totalIdeas / 8);
  const trunkHeight = baseTrunkHeight + (growthFactor * maxGrowthHeight);
  
  // Trunk thickness starts at 6px, goes up to 18px
  const trunkWidth = 6 + (growthFactor * 10);
  
  const trunkStartY = 360;
  const trunkEndY = trunkStartY - trunkHeight;
  
  // Curved trunk for more organic pebble-feel
  const trunkCpX = 200 - (groups.length * 4); // bends slightly as branches grow
  trunkEl.setAttribute('d', `M 200 ${trunkStartY} Q ${trunkCpX} ${trunkStartY - trunkHeight/2} 200 ${trunkEndY}`);
  trunkEl.setAttribute('stroke-width', trunkWidth.toString());
  
  // Clear dynamic branches and leaves
  branchesContainer.innerHTML = '';
  leavesContainer.innerHTML = '';
  
  // Colors for branches / groups (categorized growth colors matching the design system)
  const groupColors = [
    'var(--color-primary-green)',
    'var(--color-sage)',
    'var(--color-harvest)',
    'var(--color-nutrient)',
    'var(--color-text-muted)',
    'var(--color-compost)'
  ];
  
  // 2. Generate Branches (for groups)
  groups.forEach((g, index) => {
    // Branch heights are distributed along the upper half of the trunk
    const ratio = (index + 1) / (groups.length + 1);
    const branchStartY = trunkEndY + (trunkHeight * 0.55 * ratio);
    
    // Alternate branch directions (left, right, center-left, center-right)
    const isLeft = index % 2 === 0;
    const branchLength = 40 + Math.min(40, g.childCount * 10);
    const branchAngle = (isLeft ? -35 : 35) + (index * 4 * (isLeft ? -1 : 1));
    const angleRad = branchAngle * Math.PI / 180;
    
    // Calculate start position on the curved trunk
    // Since trunk curves, we interpolate the Y coordinates and apply slight X offset
    const t = (trunkStartY - branchStartY) / trunkHeight;
    const branchStartX = 200 + (t * (200 - trunkCpX) * 0.5 * (isLeft ? 1 : -1));
    
    const branchEndX = branchStartX + Math.sin(angleRad) * branchLength;
    const branchEndY = branchStartY - Math.cos(angleRad) * branchLength;
    
    // Create branch element
    const branch = document.createElementNS("http://www.w3.org/2000/svg", "path");
    branch.setAttribute('d', `M ${branchStartX} ${branchStartY} Q ${branchStartX + (branchEndX-branchStartX)*0.2} ${branchStartY - 10} ${branchEndX} ${branchEndY}`);
    branch.setAttribute('stroke', 'var(--color-primary-green)'); // Dark growth green bark
    branch.setAttribute('stroke-width', Math.max(3, 8 - index * 1.2).toString());
    branch.setAttribute('stroke-linecap', 'round');
    branch.setAttribute('fill', 'none');
    branch.classList.add('grow-branch');
    branchesContainer.appendChild(branch);
    
    // 3. Generate Leaves on the branches (child tokens)
    const color = groupColors[index % groupColors.length];
    
    for (let c = 0; c < g.childCount; c++) {
      // Space leaves along branch
      const leafRatio = (c + 1) / (g.childCount + 1);
      const leafX = branchStartX + (branchEndX - branchStartX) * leafRatio;
      const leafY = branchStartY + (branchEndY - branchStartY) * leafRatio;
      
      const leafAngle = branchAngle + (c % 2 === 0 ? 45 : -45);
      
      createLeaf(leafX, leafY, leafAngle, color, false);
    }
  });
  
  // 4. Generate Solo Leaves (floating/budding from trunk)
  for (let s = 0; s < soloIdeasCount; s++) {
    // Distribute solo leaves along the trunk top/sides
    const ratio = (s + 1) / (soloIdeasCount + 1);
    const leafY = trunkEndY + (trunkHeight * 0.45 * ratio);
    const isLeft = s % 2 === 0;
    const leafX = 200 + (isLeft ? -8 : 8);
    const leafAngle = isLeft ? -70 : 70;
    
    // Solo leaves are sage-green buds
    createLeaf(leafX, leafY, leafAngle, 'var(--color-sage)', true);
  }
}

// SVG Leaf helper
function createLeaf(cx, cy, angle, color, isSolo) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${angle})`);
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  // Smooth leaf curve path
  path.setAttribute('d', "M 0 0 C -6 -12, -14 -12, -18 0 C -14 12, -6 12, 0 0");
  path.setAttribute('fill', color);
  
  // Subtle leaf veins or detail line
  path.setAttribute('stroke', 'rgba(255,255,255,0.25)');
  path.setAttribute('stroke-width', '1');
  
  if (isSolo) {
    path.classList.add('grow-leaf-solo');
  } else {
    path.classList.add('grow-leaf');
  }
  
  g.appendChild(path);
  leavesContainer.appendChild(g);
}

// Update UI Text elements
function updateLabels() {
  const { totalIdeas, groups, sessionTitle, activeState } = currentState;
  
  ideasStatEl.textContent = totalIdeas.toString();
  groupsStatEl.textContent = groups.length.toString();
  titleEl.textContent = sessionTitle;
  
  if (activeState === 'welcome') {
    statusTextEl.textContent = 'Klaar voor start. Welkomstscherm geopend.';
  } else if (activeState === 'chooseExperience') {
    statusTextEl.textContent = 'Ervaring kiezen op tafel...';
  } else if (activeState === 'tableSession') {
    if (totalIdeas === 0) {
      statusTextEl.textContent = 'Sessie gestart. Plant zaden op tafel.';
    } else if (totalIdeas < 3) {
      statusTextEl.textContent = 'Eerste kiem van de creatieve groei.';
    } else if (totalIdeas < 6) {
      statusTextEl.textContent = 'Actieve groei en wortelverbindingen zichtbaar.';
    } else {
      statusTextEl.textContent = 'Bloeiend wortelnetwerk van co-reflectie gevormd.';
    }
  } else if (activeState === 'sessionSummary') {
    statusTextEl.textContent = 'Oogst wordt gebundeld.';
  } else if (activeState === 'endSession') {
    statusTextEl.textContent = 'Creatieve groeisessie afgerond.';
  }
}

// Listen for updates from Main tabletop screen
channel.onmessage = (event) => {
  const { type, data } = event.data;
  
  if (type === 'state-update') {
    currentState = {
      totalIdeas: data.totalIdeas,
      soloIdeasCount: data.soloIdeasCount,
      groups: data.groups,
      sessionTitle: data.sessionTitle,
      activeState: data.activeState
    };
    
    updateLabels();
    updateTree();
  } else if (type === 'reset') {
    currentState = {
      totalIdeas: 0,
      soloIdeasCount: 0,
      groups: [],
      sessionTitle: 'Creatieve Speelruimte',
      activeState: 'welcome'
    };
    
    updateLabels();
    updateTree();
  }
};

// Initial Setup
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  updateLabels();
  updateTree();
});
