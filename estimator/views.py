from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Avg
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
import json
from django.shortcuts import get_object_or_404
from django.db.models import F
from .models import ProjectEstimate
from estimator.utils.cost_calculator import generate_estimate_data
import joblib
import numpy as np
import os

# Load the model
try:
    model_path = os.path.join(os.path.dirname(__file__), 'model/construction_risk_predictor.pkl')
    model = joblib.load(model_path)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None


def home(request):
    """
    Home page view that renders the main index template
    """
    return render(request, 'index.html')
  
@login_required
def user_dashboard(request, user_id):
    """
    Dashboard view for showing recent project estimates for a specific user
    """
    user_projects = ProjectEstimate.objects.filter(user_id=user_id).order_by('-created_at')[:10]

    context = {
        'projects': user_projects,
        'total_projects': user_projects.count(),
        'average_area': user_projects.aggregate(Avg('total_area'))['total_area__avg'] or 0,
    }

    return render(request, 'userdashboard.html', context)

@csrf_exempt  # Or use CSRF token via AJAX
@login_required
def save_project_estimate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            project = ProjectEstimate.objects.create(
                user=request.user,
                project_name=data['projectName'],
                location=data['location'],
                project_type=data['projectType'],
                total_area=data['totalArea'],
                length=data['length'],
                width=data['width'],
                height=data['height'],
                floors=data['floors'],
                concrete_grade=data['concreteGrade'],
                steel_grade=data['steelGrade'],
                brick_type=data['brickType'],
                finishing_type=data['finishingType'],
                labor_hours=data['laborHours'],
                skill_level=data['skillLevel'],
                equipment_needs=data['equipmentNeeds']
            )
            return JsonResponse({'message': 'Project saved!', 'id': project.id})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request'}, status=400)       

@login_required
def project_estimation_dashboard(request, project_id):
    project = get_object_or_404(ProjectEstimate, id=project_id, user=request.user)

    # Simple cost estimation formulas
    total_area = project.total_area
    cost_per_sqft = 1500  # Approx avg ₹/sqft — this can be dynamic later
    total_cost = total_area * cost_per_sqft

    material_percentages = {
        'Cement': 0.164,
        'Steel': 0.25,
        'Bricks': 0.12,
        'Finishing': 0.15,
        'Labor': 0.20,
        'Miscellaneous': 0.116
    }

    material_breakdown = []
    for name, percent in material_percentages.items():
        amount = round(total_cost * percent)
        material_breakdown.append({
            'name': name,
            'percent': f"{percent*100:.1f}%",
            'amount': amount
        })

    # 6-Month Timeline cost division (assume linear)
    monthly_costs = []
    for month in range(1, 7):
        monthly_costs.append({
            'month': f"Month {month}",
            'cost': round(total_cost / 6)
        })
  
    estimation = generate_estimate_data(project)
    
    context = {
        'project': project,
        'total_cost': estimation['total_cost'],
        'material_breakdown': estimation['material_breakdown'],
        'monthly_costs': estimation['monthly_costs'], 
        'monthly_json': json.dumps(estimation['monthly_costs']),
        'material_json': json.dumps(estimation['material_breakdown']),
        'estimated_months': estimation['estimated_months'],
        'monthly_budget': round(estimation['total_cost'] / estimation['estimated_months']),
        'stage_breakdown': estimation['stage_breakdown'],
        'monthly_percentages': estimation['monthly_percentages'],
    }


    return render(request, 'estimation_dashboard.html', context) 


def riskPredictor(request):
    context = {
        'predicted_risk': None,
        'risk_category': None,
        'risk_factors': None
    }

    if model is None:
        context['error'] = "Model not available. Please ensure the model is properly trained and saved."
        return render(request, 'risk.html', context)

    if request.method == 'POST':
        try:
            # Collect input data
            input_fields = {
                'temperature': float(request.POST['temperature']),
                'humidity': float(request.POST['humidity']),
                'vibration_level': float(request.POST['vibration_level']),
                'material_usage': float(request.POST['material_usage']),
                'worker_count': int(request.POST['worker_count']),
                'energy_consumption': float(request.POST['energy_consumption']),
                'cost_deviation': float(request.POST['cost_deviation']),
                'time_deviation': float(request.POST['time_deviation']),
                'safety_incidents': int(request.POST['safety_incidents']),
                'equipment_utilization_rate': float(request.POST['equipment_utilization_rate']),
                'material_shortage_alert': int(request.POST['material_shortage_alert'])
            }

            # Input validation
            for field, value in input_fields.items():
                if value < 0:
                    raise ValueError(f"Invalid negative value for {field}")

            input_data = np.array([[value for value in input_fields.values()]])
            
            # Get prediction
            predicted_risk = model.predict(input_data)[0] * 100
            predicted_risk = round(predicted_risk, 2)

            # Categorize risk
            risk_category = categorize_risk(predicted_risk)
            
            # Analyze risk factors
            risk_factors = analyze_risk_factors(input_fields)

            context.update({
                'predicted_risk': predicted_risk,
                'risk_category': risk_category,
                'risk_factors': risk_factors
            })

        except Exception as e:
            context['error'] = f"Error: {str(e)}"

    return render(request, 'risk.html', context)

def categorize_risk(risk_value):
    if risk_value < 20:
        return {'level': 'Low', 'color': 'green', 'description': 'Project is relatively safe with minimal risks.'}
    elif risk_value < 50:
        return {'level': 'Moderate', 'color': 'yellow', 'description': 'Project has notable risks that need monitoring.'}
    elif risk_value < 75:
        return {'level': 'High', 'color': 'orange', 'description': 'Significant risks present. Close monitoring required.'}
    else:
        return {'level': 'Critical', 'color': 'red', 'description': 'Extreme risk level. Immediate attention needed.'}

def analyze_risk_factors(input_fields):
    risk_factors = []
    
    # Analyze cost-related risks
    if input_fields['cost_deviation'] > 10:
        risk_factors.append({
            'factor': 'Cost Deviation',
            'severity': 'High',
            'recommendation': 'Review budget allocation and control measures'
        })
    
    # Analyze timeline risks
    if input_fields['time_deviation'] > 15:
        risk_factors.append({
            'factor': 'Timeline Delay',
            'severity': 'High',
            'recommendation': 'Implement schedule recovery plan'
        })
    
    # Analyze environmental risks
    if input_fields['temperature'] > 35 or input_fields['humidity'] > 80:
        risk_factors.append({
            'factor': 'Environmental Conditions',
            'severity': 'Medium',
            'recommendation': 'Consider weather protection measures'
        })
    
    # Analyze safety risks
    if input_fields['safety_incidents'] > 0:
        risk_factors.append({
            'factor': 'Safety Concerns',
            'severity': 'High',
            'recommendation': 'Review safety protocols and training'
        })

    return risk_factors