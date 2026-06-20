import { PrismaD1 } from '@prisma/adapter-d1'
import type { Context } from 'hono'
import { env } from 'hono/adapter'
import { PrismaClient } from '../generated/prisma'
import { Bindings } from '..'

let prisma: PrismaClient | null = null

const getPrismaClient = (c: Context) => {
    if (!prisma) {
        const { DB } = env<Bindings>(c)
        const adapter = new PrismaD1(DB)
        prisma = new PrismaClient({ adapter })
    }
    return prisma
}

export const prismaMiddleware = async (c: Context, next: () => Promise<void>) => {
    c.set('prisma', getPrismaClient(c))
    await next()
}

declare module 'hono' {
    interface ContextVariableMap {
        prisma: PrismaClient
    }
}