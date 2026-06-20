import { env } from "cloudflare:test"

import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../src/generated/prisma";
import { initialize } from "../src/generated/fabbrica";

const adapter = new PrismaD1(env.DB)
const prisma = new PrismaClient({ adapter })
initialize({ prisma });
