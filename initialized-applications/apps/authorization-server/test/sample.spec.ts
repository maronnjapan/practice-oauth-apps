import { defineUserFactory } from '../src/generated/fabbrica'
import { fetchTestApplication } from './utils'

const userFactory = defineUserFactory()

describe('test', () => {
    it('sample test', async () => {
        const user = await userFactory.create({
            email: 'sampleTest@example.com',
            password: 'password3333333',
        })

        const res = await fetchTestApplication('/')


        const json = await res.json() as {
            id: string;
            email: string;
            password: string;
            createdAt: Date;
            updatedAt: Date;
        }[]

        expect(json).toHaveLength(1)
        expect(json[0].id).toEqual(user.id)
        expect(json[0].email).toEqual(user.email)
        expect(json[0].password).toEqual(user.password)
    })
})