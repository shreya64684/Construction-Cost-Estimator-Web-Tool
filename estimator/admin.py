from django.contrib import admin
from .models import ProjectEstimate

class ProjectEstimateAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'user', 'location', 'total_area', 'created_at')
    list_filter = ('location', 'project_type', 'created_at')
    search_fields = ('project_name', 'location', 'project_type', 'user__username')

admin.site.register(ProjectEstimate, ProjectEstimateAdmin)
