import { init } from '@instantdb/admin';

const APP_ID = 'de6141d2-6507-48c1-981e-9ba2c71ccc6d';

const db = init({
  appId: APP_ID,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN
});

async function listProjects() {
  try {
    const { data } = await db.query({
      projects: {}
    });

    console.log('Projects in database:');
    data?.projects?.forEach(p => {
      console.log(`  ID: ${p.id}, Slug: ${p.slug}, Title: ${p.title}`);
    });

  } catch (error) {
    console.error('Failed:', error);
  }
}

listProjects();