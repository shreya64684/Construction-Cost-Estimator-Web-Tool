// Project Estimator Form Handler

const projectForm = document.getElementById('project-form');
const stepContent = document.getElementById('step-content');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const currentStepIndicator = document.getElementById('current-step');
const steps = document.querySelectorAll('.step');

let currentStep = 1;
const totalSteps = 4;

// Form data structure
let formData = {
    basic_info: {},
    dimensions: {},
    materials: [],
    labor: []
};

// Step content configurations
const stepConfigs = {
    1: {
        title: 'Basic Information',
        fields: [
            {
                name: 'title',
                label: 'Project Title',
                type: 'text',
                required: true,
                placeholder: 'Enter project title'
            },
            {
                name: 'project_type',
                label: 'Project Type',
                type: 'select',
                required: true,
                options: [
                    { value: 'RES', label: 'Residential' },
                    { value: 'COM', label: 'Commercial' },
                    { value: 'REN', label: 'Renovation' }
                ]
            },
            {
                name: 'location',
                label: 'Project Location',
                type: 'text',
                required: true,
                placeholder: 'Enter project location'
            }
        ]
    },
    2: {
        title: 'Project Dimensions',
        fields: [
            {
                name: 'total_area',
                label: 'Total Area (sq ft)',
                type: 'number',
                required: true,
                placeholder: 'Enter total area'
            },
            {
                name: 'stories',
                label: 'Number of Stories',
                type: 'number',
                required: true,
                placeholder: 'Enter number of stories'
            }
        ]
    },
    3: {
        title: 'Materials',
        fields: [
            {
                name: 'material_type',
                label: 'Material Type',
                type: 'select',
                required: true,
                options: [] // Will be populated from backend
            },
            {
                name: 'quantity',
                label: 'Quantity',
                type: 'number',
                required: true,
                placeholder: 'Enter quantity'
            }
        ]
    },
    4: {
        title: 'Labor Requirements',
        fields: [
            {
                name: 'labor_category',
                label: 'Labor Category',
                type: 'select',
                required: true,
                options: [] // Will be populated from backend
            },
            {
                name: 'hours',
                label: 'Estimated Hours',
                type: 'number',
                required: true,
                placeholder: 'Enter estimated hours'
            }
        ]
    }
};

// Generate form fields for current step
function renderStepContent(step) {
    const config = stepConfigs[step];
    stepContent.innerHTML = `
        <h3 class="text-xl font-semibold mb-6 text-primary-800 col-span-2">${config.title}</h3>
        ${config.fields.map(field => createFormField(field)).join('')}
    `;
}

// Create individual form field HTML
function createFormField(field) {
    if (field.type === 'select') {
        return `
            <div class="form-group">
                <label class="block text-sm font-medium text-secondary-700 mb-2" for="${field.name}">${field.label}</label>
                <select 
                    id="${field.name}"
                    name="${field.name}"
                    class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    ${field.required ? 'required' : ''}
                >
                    <option value="">Select ${field.label}</option>
                    ${field.options.map(opt => `
                        <option value="${opt.value}">${opt.label}</option>
                    `).join('')}
                </select>
            </div>
        `;
    }
    
    return `
        <div class="form-group">
            <label class="block text-sm font-medium text-secondary-700 mb-2" for="${field.name}">${field.label}</label>
            <input 
                type="${field.type}"
                id="${field.name}"
                name="${field.name}"
                class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}
            >
        </div>
    `;
}

// Update step indicators
function updateStepIndicators() {
    steps.forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    currentStepIndicator.textContent = currentStep;
    backBtn.disabled = currentStep === 1;
    nextBtn.textContent = currentStep === totalSteps ? 'Submit' : 'Next';
}

// Handle form navigation
function handleNavigation(direction) {
    if (direction === 'next' && currentStep < totalSteps) {
        currentStep++;
    } else if (direction === 'back' && currentStep > 1) {
        currentStep--;
    }
    renderStepContent(currentStep);
    updateStepIndicators();
}

// Save form data
function saveFormData() {
    const currentFields = stepConfigs[currentStep].fields;
    currentFields.forEach(field => {
        const input = document.getElementById(field.name);
        if (currentStep === 1) {
            formData.basic_info[field.name] = input.value;
        } else if (currentStep === 2) {
            formData.dimensions[field.name] = input.value;
        } else if (currentStep === 3) {
            formData.materials.push({
                type: document.getElementById('material_type').value,
                quantity: document.getElementById('quantity').value
            });
        } else if (currentStep === 4) {
            formData.labor.push({
                category: document.getElementById('labor_category').value,
                hours: document.getElementById('hours').value
            });
        }
    });
}

// Submit form data to backend
async function submitFormData() {
    try {
        // First fetch material and labor options
        const [materialsRes, laborRes] = await Promise.all([
            fetch('/estimator/get_materials/'),
            fetch('/estimator/get_labor_categories/')
        ]);
        
        const materials = await materialsRes.json();
        const laborCategories = await laborRes.json();
        
        // Map material/labor names to IDs
        formData.materials = formData.materials.map(m => ({
            type: materials.materials.find(mat => mat.name === m.type)?.id || 0,
            quantity: m.quantity
        }));
        
        formData.labor = formData.labor.map(l => ({
            category: laborCategories.labor_categories.find(lab => lab.category === l.category)?.id || 0,
            hours: l.hours
        }));
        
        // Submit complete form data
        const response = await fetch('/estimator/create_project/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save project');
        }

        const result = await response.json();
        window.location.href = `/projects/${result.id}/`;
    } catch (error) {
        console.error('Error saving project:', error);
        alert(`Failed to save project: ${error.message}`);
    }
}

// Get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Event Listeners
backBtn.addEventListener('click', () => handleNavigation('back'));

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveFormData();
    
    if (currentStep < totalSteps) {
        handleNavigation('next');
    } else {
        await submitFormData();
    }
});

// Initialize form
renderStepContent(currentStep);
updateStepIndicators();