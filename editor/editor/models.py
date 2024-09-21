from django.db import models


class Page(models.Model):
    slug = models.TextField(null=False)
    content = models.TextField(null=False)

    class Meta:
        db_table = "pages"


class Project(models.Model):
    title = models.TextField(null=False)
    slug = models.TextField(null=False)
    image = models.TextField(null=False)
    description = models.TextField(null=False)

    class Meta:
        db_table = "projects"


class Update(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    created_at = models.TextField(null=False)
    content = models.TextField(null=False)

    class Meta:
        db_table = "updates"


class Attachment(models.Model):
    update = models.ForeignKey(Update, on_delete=models.CASCADE)
    url = models.TextField(null=False)

    class Meta:
        db_table = "attachments"
