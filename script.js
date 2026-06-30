// Three.js 3D Computer Model with Mouse Controls
function initThreeJS() {
    const canvas = document.getElementById('three-d-canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create computer components
    const computerGroup = new THREE.Group();

    // Modern monitor
    const monitorGeometry = new THREE.BoxGeometry(3.2, 2, 0.2);
    const monitorMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.3
    });
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
    monitor.position.y = 1.8;
    monitor.castShadow = true;
    monitor.receiveShadow = true;
    computerGroup.add(monitor);

    // Monitor screen with glowing effect
    const screenGeometry = new THREE.PlaneGeometry(2.8, 1.6);
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0x112240,
        emissive: 0x4d7cff,
        emissiveIntensity: 0.8
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 1.8, 0.11);
    computerGroup.add(screen);

    // Monitor stand
    // ADJUSTMENT: Reduced stand height from 1.5 to 1.0
    const standGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1.0, 8);
    const standMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.3
    });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    // ADJUSTMENT: Adjusted y-position to 0.3 (0.8 monitor base - 0.5 stand half-height)
    stand.position.set(0, 0.3, 0);
    stand.castShadow = true;
    stand.receiveShadow = true;
    computerGroup.add(stand);

    // Keyboard base
    const keyboardGeometry = new THREE.BoxGeometry(3.0, 0.15, 1.0);
    const keyboardMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.4,
        roughness: 0.6
    });
    const keyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    keyboard.position.set(0, -0.48, 1.3);
    keyboard.rotation.x = -0.08;
    keyboard.castShadow = true;
    keyboard.receiveShadow = true;
    computerGroup.add(keyboard);

    // Keyboard keys (grid of small keys)
    const keyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        metalness: 0.2,
        roughness: 0.7
    });
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 15; col++) {
            const keyGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.15);
            const key = new THREE.Mesh(keyGeometry, keyMaterial);
            const xPos = -1.2 + col * 0.18;
            const zPos = 1.0 + row * 0.18;
            key.position.set(xPos, -0.36, zPos);
            key.rotation.x = -0.08;
            computerGroup.add(key);
        }
    }

    // Mouse - positioned more to the right
    const mouseGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const mouseMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.4,
        roughness: 0.5
    });
    const mouse = new THREE.Mesh(mouseGeometry, mouseMaterial);
    mouse.position.set(2.2, -0.5, 1.5);
    mouse.scale.set(1.5, 0.7, 1);
    mouse.castShadow = true;
    mouse.receiveShadow = true;
    computerGroup.add(mouse);

    scene.add(computerGroup);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add screen light that emanates from the computer screen
    const screenLight = new THREE.PointLight(0x4d7cff, 1.5, 10);
    screenLight.position.set(0, 1.8, 0.5);
    scene.add(screenLight);

    // Add directional light from screen direction
    const screenDirectionalLight = new THREE.DirectionalLight(0x7ea1ff, 0.8);
    screenDirectionalLight.position.set(0, 1.8, 3);
    screenDirectionalLight.target.position.set(0, 0, 0);
    scene.add(screenDirectionalLight);
    scene.add(screenDirectionalLight.target);

    // Add subtle fill light
    const fillLight = new THREE.DirectionalLight(0x233554, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    camera.position.z = 8;

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };

    // Mouse down event
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
    });

    // Mouse up event
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Mouse move event
    canvas.addEventListener('mousemove', (e) => {
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        if (isDragging) {
            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 0.5),
                    toRadians(deltaMove.x * 0.5),
                    0,
                    'XYZ'
                ));

            computerGroup.quaternion.multiplyQuaternions(deltaRotationQuaternion, computerGroup.quaternion);
        }

        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.position.z += e.deltaY * 0.01;
        camera.position.z = Math.max(5, Math.min(15, camera.position.z));
    });

    // Helper function to convert degrees to radians
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Animation
    function animate() {
        requestAnimationFrame(animate);

        // Subtle continuous rotation when not being dragged
        if (!isDragging) {
            computerGroup.rotation.y += 0.002;
        }

        // Pulsing screen glow effect
        const time = Date.now() * 0.001;
        screen.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(time * 2);
        screenLight.intensity = 1.2 + 0.3 * Math.sin(time * 2);

        // Activate screen glow overlay when screen is facing viewer
        const screenGlow = document.getElementById('screen-glow');
        if (screenGlow) {
            const screenDirection = new THREE.Vector3();
            screen.getWorldDirection(screenDirection);
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);

            const dotProduct = screenDirection.dot(cameraDirection);
            if (dotProduct < -0.3) {
                screenGlow.classList.add('active');
            } else {
                screenGlow.classList.remove('active');
            }
        }

        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// Mobile menu functionality
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });

    mobileMenuClose.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    });
}

// Smooth scrolling for navigation links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Header scroll effect
function setupHeaderScroll() {
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 100) {
            header.style.padding = '10px 0';
            header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.padding = '18px 0';
            header.style.boxShadow = 'none';
        }
    });
}

// Experience Tabs Functionality
function openTab(btn, jobName) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
    });
    const panel = document.getElementById(jobName);
    panel.style.display = 'block';
    setTimeout(() => panel.classList.add('active'), 10);
    btn.classList.add('active');
}

function setupTabs() {
    const tabsList = document.querySelector('.tabs-list');
    if (!tabsList) return;
    tabsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tab]');
        if (!btn) return;
        openTab(btn, btn.dataset.tab);
    });
}

// Masonry Projects Expand/Collapse Functionality
function toggleExpand(button) {
    const card = button.closest('.masonry-card');
    const expandedContent = card.querySelector('.expanded-content');
    button.classList.toggle('active');
    expandedContent.classList.toggle('active');
    if (expandedContent.classList.contains('active')) {
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Show Less';
    } else {
        button.innerHTML = '<i class="fas fa-chevron-down"></i> Read More';
    }
}

function setupExpandButtons() {
    const masonry = document.querySelector('.projects-masonry');
    if (!masonry) return;
    masonry.addEventListener('click', (e) => {
        const btn = e.target.closest('.expand-btn');
        if (!btn) return;
        toggleExpand(btn);
    });
}

// Initialize all functionalities
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE !== 'undefined') {
        initThreeJS();
    }

    setupEmail();
    setupMobileMenu();
    setupSmoothScrolling();
    setupHeaderScroll();
    setupTabs();
    setupExpandButtons();
});

function setupEmail() {
    // Split into two parts so the full address never appears as a plain string in source
    const user = 'aalnowaiserr';
    const domain = 'gmail.com';
    const link = document.getElementById('email-link');
    if (!link) return;
    const address = user + '@' + domain;
    link.href = 'mailto:' + address;
    link.textContent = address;
}