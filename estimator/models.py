from django.db import models
from django.contrib.auth.models import User

class ProjectEstimate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    project_name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    project_type = models.CharField(max_length=50)
    total_area = models.FloatField()
    
    length = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()
    floors = models.IntegerField()
    
    concrete_grade = models.CharField(max_length=50)
    steel_grade = models.CharField(max_length=50)
    brick_type = models.CharField(max_length=50)
    finishing_type = models.CharField(max_length=50)
    
    labor_hours = models.FloatField()
    skill_level = models.CharField(max_length=50)
    equipment_needs = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.project_name
