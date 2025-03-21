import {Knex, knex} from "knex";
import {v4 as uuid} from "uuid";
enum ISOLATION_LEVEL{
    READ_UNCOMMITTED = "READ UNCOMMITTED",
    READ_COMMITTED = "READ COMMITTED",
    REPEATABLE_READ = "REPEATABLE_READ",
    SERIALIZABLE = "SERIALIZABLE",
}

export const createDatabase = () =>{
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }
    return knex({
        client: 'pg',
        connection: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 5
        },
    });
};

export const isJson = (value: string) =>{
    try{
        return Boolean(JSON.parse(value));
    }
    catch(e){
        return false;
    }
};

export const transactionHandler = async <T = any>(
    knex: Knex,
    callback: (trx: Knex.Transaction) => Promise<T>,
    options: {
        retryTimes?: number,
        maxBackoff?: number,
        isolation? : ISOLATION_LEVEL,
    } = {}
) => {
    const { retryTimes = 100, maxBackoff = 1000, isolation } = options
    let attempts = 0;

    const execTransaction = async(): Promise<T> => {
        
        const trx = await knex.transaction();

        try{
            if(isolation)
                await trx.raw(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);

            const result = await callback(trx);

            await trx.commit();

            return result;

        }catch(err: any){
            await trx.rollback();

            if(err.code !== "1205") throw err;

            if(attempts > retryTimes)
                throw Error("[Transaction] retry times is up to max.");

            attempts++;

            await sleep(maxBackoff)

            return execTransaction();
        }
    };

    return await execTransaction();
};

function sleep(maxBackoff: number) {
    return new Promise((resolve) => setTimeout(() => resolve(1), maxBackoff));
}

export const genUID = () => {

    const alpha = "abcdefghij"

    const timestampStr = new Date().getTime().toString();

    const code = timestampStr.split("")
        .map((v,idx) => idx % 2 ? v : alpha[Number(v)]) 
        .join("");

    const id = uuid().split("-")[0];
    return `${code}${id.substring(0, id.length - 1)}`;
};