import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    pages: i.entity({
      slug: i.string().unique().indexed(),
      content: i.string(),
      title: i.string(),
    }),
    projects: i.entity({
      title: i.string(),
      slug: i.string().unique().indexed(),
      image: i.string(),
      description: i.string(),
      createdAt: i.number().indexed(),
    }),
    updates: i.entity({
      content: i.string(),
      createdAt: i.number().indexed(),
    }),
    attachments: i.entity({
      url: i.string(),
      filename: i.string(),
    }),
  },
  links: {
    projectUpdates: {
      forward: { on: "updates", has: "one", label: "project", required: true },
      reverse: { on: "projects", has: "many", label: "updates" },
    },
    updateAttachments: {
      forward: { on: "attachments", has: "one", label: "update", required: true },
      reverse: { on: "updates", has: "many", label: "attachments" },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
