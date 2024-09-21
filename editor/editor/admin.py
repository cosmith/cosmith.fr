from django.contrib import admin
from .models import Page, Project, Update, Attachment


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("slug", "content")
    search_fields = ("slug", "content")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "image", "description")
    search_fields = ("title", "slug", "description")


@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display = ("project", "created_at", "content")
    list_filter = ("project", "created_at")
    search_fields = ("content",)


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("update", "url")
    list_filter = ("update",)
    search_fields = ("url",)
