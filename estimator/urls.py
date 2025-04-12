from django.urls import path
from . import views 
# from .project_views.project_views import save_project, get_project 
from .views import save_project_estimate

urlpatterns = [

     path('', views.home, name='home'),

    path('<int:user_id>/user-dashboard/',views.user_dashboard, name='user_dashboard'),
    path('save-project-estimate/', save_project_estimate, name='save_project_estimate'),
    path('project-estimate/<int:project_id>/dashboard/', views.project_estimation_dashboard, name='project_estimation_dashboard'),
    path('risk/', views.riskPredictor, name='riskPredictor'),
]
