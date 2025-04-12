from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from ..models import Project, Material, Labor, ProjectMaterial, ProjectLabor, CostEstimate

@login_required
@require_http_methods(['POST'])
def save_project(request):
    try:
        # Create Project
        project = Project.objects.create(
            user=request.user,
            title=request.POST['title'],
            project_type=request.POST['project_type'],
            total_area=float(request.POST['total_area']),
            location=request.POST['location']
        )

        # Create Material
        material = Material.objects.create(
            name=request.POST['material_name'],
            unit=request.POST['unit'],
            cost_per_unit=float(request.POST['material_cost'])
        )

        # Create Project Material
        project_material = ProjectMaterial.objects.create(
            project=project,
            material=material,
            quantity=float(request.POST['quantity'])
        )

        # Create Labor
        labor = Labor.objects.create(
            category=request.POST['labor_category'],
            hourly_rate=float(request.POST['hourly_rate'])
        )

        # Create Project Labor
        project_labor = ProjectLabor.objects.create(
            project=project,
            labor=labor,
            hours=float(request.POST['hours'])
        )

        # Calculate material and labor costs
        material_cost = project_material.total_cost
        labor_cost = project_labor.total_cost

        # Create Cost Estimate
        estimate = CostEstimate.objects.create(
            project=project,
            material_cost=material_cost,
            labor_cost=labor_cost,
            overhead_cost=float(request.POST['overhead_cost']),
            profit_margin=float(request.POST['profit_margin']),
            contingency=float(request.POST['contingency'])
        )

        # Update project's estimated cost
        project.estimated_cost = estimate.total_cost
        project.save()

        return JsonResponse({
            'status': 'success',
            'project_id': project.id
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=400)

@login_required
def get_project(request, project_id):
    project = get_object_or_404(Project, id=project_id, user=request.user)
    estimate = get_object_or_404(CostEstimate, project=project)
    
    return JsonResponse({
        'project': {
            'id': project.id,
            'title': project.title,
            'project_type': project.project_type,
            'total_area': float(project.total_area),
            'location': project.location,
            'estimated_cost': float(project.estimated_cost),
            'status': project.status,
            'completion_percentage': project.completion_percentage
        },
        'estimate': {
            'material_cost': float(estimate.material_cost),
            'labor_cost': float(estimate.labor_cost),
            'overhead_cost': float(estimate.overhead_cost),
            'profit_margin': float(estimate.profit_margin),
            'contingency': float(estimate.contingency),
            'total_cost': float(estimate.total_cost)
        }
    })