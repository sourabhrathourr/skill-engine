import { z } from "zod";

export const requestContextSchema = z
  .object({
    productType: z.string().trim().min(1).max(120).optional(),
    audience: z.string().trim().min(1).max(200).optional(),
    constraints: z.array(z.string().trim().min(1).max(200)).optional(),
    successMetric: z.string().trim().min(1).max(200).optional(),
  })
  .partial();

export const prdSchema = z.object({
  title: z.string().min(3),
  problem: z.string().min(10),
  goals: z.array(z.string().min(2)).min(2),
  nonGoals: z.array(z.string().min(2)).min(1),
  personas: z.array(z.string().min(2)).min(1),
  requirements: z.array(z.string().min(2)).min(3),
  successMetrics: z.array(z.string().min(2)).min(2),
  risks: z.array(z.string().min(2)).min(1),
});

export const featurePrioritySchema = z.enum(["P0", "P1", "P2"]);

export const selectedFeatureSchema = z.object({
  featureId: z.string().min(1),
  title: z.string().min(2),
  priority: featurePrioritySchema,
  rationale: z.string().min(10),
  dependencies: z.array(z.string().min(1)).default([]),
});

export const deferredFeatureSchema = z.object({
  featureId: z.string().min(1),
  reason: z.string().min(5),
});

export const featureSetSchema = z.object({
  selected: z.array(selectedFeatureSchema).min(1),
  deferred: z.array(deferredFeatureSchema).default([]),
});

export const finalPayloadSchema = z.object({
  prd: prdSchema,
  featureSet: featureSetSchema,
});

export type RequestContext = z.infer<typeof requestContextSchema>;
export type Prd = z.infer<typeof prdSchema>;
export type FeatureSet = z.infer<typeof featureSetSchema>;
export type FinalPayload = z.infer<typeof finalPayloadSchema>;
