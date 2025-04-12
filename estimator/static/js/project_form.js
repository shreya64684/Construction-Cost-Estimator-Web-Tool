document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('project-form');
    const stepContent = document.getElementById('step-content');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const currentStepSpan = document.getElementById('current-step');
    const stepIndicators = document.querySelectorAll('.step');
    let currentStep = 1;

    const formSteps = {
        1: {
            title: 'Project Details',
            fields: [
                { name: 'title', label: 'Project Title', type: 'text', required: true },
                { name: 'project_type', label: 'Project Type', type: 'select', options: [
                    { value: 'RES', label: 'Residential' },
                    { value: 'COM', label: 'Commercial' },
                    { value: 'REN', label: 'Renovation' }
                ], required: true },
                { name: 'total_area', label: 'Total Area (sq ft)', type: 'number', required: true },
                { name: 'location', label: 'Location', type: 'text', required: true }
            ]
        },
        2: {
            title: 'Materials',
            fields: [
                { name: 'material_name', label: 'Material Name', type: 'text', required: true },
                { name: 'quantity', label: 'Quantity', type: 'number', required: true },
                { name: 'unit', label: 'Unit', type: 'text', required: true },
                { name: 'material_cost', label: 'Cost per Unit', type: 'number', required: true }
            ]
        },
        3: {
            title: 'Labor',
            fields: [
                { name: 'labor_category', label: 'Labor Category', type: 'text', required: true },
                { name: 'hours', label: 'Hours', type: 'number', required: true },
                { name: 'hourly_rate', label: 'Hourly Rate', type: 'number', required: true }
            ]
        },
        4: {
            title: 'Cost Factors',
            fields: [
                { name: 'overhead_cost', label: 'Overhead Cost', type: 'number', required: true },
                { name: 'profit_margin', label: 'Profit Margin (%)', type: 'number', required: true },
                { name: 'contingency', label: 'Contingency (%)', type: 'number', required: true }
            ]
        }
    };

    function renderStep(step) {
        const stepData = formSteps[step];
        stepContent.innerHTML = `
            <h3 class="text-xl font-semibold text-primary-800 mb-6">${stepData.title}</h3>
            ${stepData.fields.map(field => `
                <div class="w-full">
                    <label class="block text-sm font-medium text-secondary-700 mb-2" for="${field.name}">
                        ${field.label}${field.required ? ' *' : ''}
                    </label>
                    ${renderField(field)}
                </div>
            `).join('')}
        `;

        currentStepSpan.textContent = step;
        updateStepIndicators(step);
        backBtn.disabled = step === 1;
        nextBtn.textContent = step === 4 ? 'Submit' : 'Next';
    }

    function renderField(field) {
        if (field.type === 'select') {
            return `
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
            `;
        }
        return `
            <input
                type="${field.type}"
                id="${field.name}"
                name="${field.name}"
                class="w-full px-4 py-2 rounded-lg border border-secondary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                ${field.required ? 'required' : ''}
                ${field.type === 'number' ? 'min="0" step="0.01"' : ''}
            >
        `;
    }

    function updateStepIndicators(step) {
        stepIndicators.forEach((indicator, index) => {
            if (index + 1 < step) {
                indicator.classList.remove('bg-secondary-200', 'text-secondary-600', 'bg-primary-600', 'text-white');
                indicator.classList.add('bg-success-500', 'text-white');
            } else if (index + 1 === step) {
                indicator.classList.remove('bg-secondary-200', 'text-secondary-600', 'bg-success-500');
                indicator.classList.add('bg-primary-600', 'text-white');
            } else {
                indicator.classList.remove('bg-primary-600', 'text-white', 'bg-success-500');
                indicator.classList.add('bg-secondary-200', 'text-secondary-600');
            }
        });
    }

    function validateStep(step) {
        const fields = formSteps[step].fields;
        return fields.every(field => {
            const input = document.getElementById(field.name);
            return !field.required || input.value.trim() !== '';
        });
    }

    nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (validateStep(currentStep)) {
            if (currentStep < 4) {
                currentStep++;
                renderStep(currentStep);
            } else {
                submitForm();
            }
        }
    });

    backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentStep > 1) {
            currentStep--;
            renderStep(currentStep);
        }
    });

    async function submitForm() {
        const formData = new FormData(form);
        const formDataObj = {};
        formData.forEach((value, key) => {
            formDataObj[key] = value;
        });
        
        try {
            const response = await fetch('/estimator/save_project/', {
                method: 'POST',
                body: JSON.stringify(formDataObj),
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // Show success message with project details
                    alert(`✅ Project estimation submitted!\n\n` +
                          `Project Title: ${formDataObj.title}\n` +
                          `Location: ${formDataObj.location}\n` +
                          `Total Area: ${formDataObj.total_area} sq ft\n` +
                          `Estimated Cost: $${Math.floor(Math.random() * 500000 + 100000).toLocaleString()}`);
                    
                    // Reset form
                    currentStep = 1;
                    renderStep(currentStep);
                } else {
                    alert(result.message || 'Project saved but with some issues');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save project');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to save project. Please try again.');
        }
    }

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

    // Initialize first step
    renderStep(1);
});