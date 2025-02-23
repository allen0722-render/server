import { isJson } from "@/utils";
import { Knex } from "knex";
import { camelCase, isEmpty, mapKeys, mapValues, snakeCase } from "lodash";

export interface IBase<T>{
    findAll(trx?: Knex.Transaction): Promise<T[] | null>;
    findOne(id: any, trx?: Knex.Transaction): Promise<T | null>;
    create(data: Omit<T, 'id'>, trx?: Knex.Transaction): Promise<T | null>;
    update(id: any, data: Partial<Omit<T ,"id">>, trx?: Knex.Transaction): Promise<T | null>;
    delete(id: any, trx?: Knex.Transaction): Promise<void>;
} 


export abstract class Base<T> implements IBase<T> {
    protected knexSql: Knex;
    protected tableName: string = '';
    protected schema = {};

    constructor({ knexSql, tableName}: { knexSql: Knex; tableName?: string}){
        this.knexSql = knexSql;
        if(tableName) this.tableName = tableName;
    }
    public findAll = async (trx?: Knex.Transaction) =>{
        let sqlBuilder = this.knexSql(this.tableName).select(this.schema);

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        return result.map(this.DBData2DataObject) as T[];
    }

    public findOne = async (id: any, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).select(this.schema).where({id});

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        return this.DBData2DataObject(result[0]) as T;
    }

    public create = async(data: Omit<T, "id">, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).insert(this.DataObject2DBData(data));

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        const result = await sqlBuilder;

        if(isEmpty(result)) return null;

        const id = result[0];

        return await this.findOne(id, trx);
    }

    public update = async(id: any, data: Partial<Omit<T, "id">>, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).update(this.DataObject2DBData(data)).where({id});

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        await sqlBuilder;

        return await this.findOne(id, trx);
    }

    public delete = async(id: any, trx?: Knex.Transaction) => {
        let sqlBuilder = this.knexSql(this.tableName).where({id}).del();

        if(trx) sqlBuilder = sqlBuilder.transacting(trx);

        await sqlBuilder;

        return;
    }

    protected DBData2DataObject = (data: any) =>{
         const transform = mapValues(data, (value, key) => {
            if(['updatedAt', 'createdAt'].includes(key)) return new Date(value);

            if(isJson(value)) return JSON.parse(value);

            return value;
        });

        return mapKeys(transform, (_value, key) => camelCase(key));
    }

    protected DataObject2DBData = (data: any) =>{
        const transform = mapValues(data, (value, key) => {
           if(['updatedAt', 'createdAt'].includes(key)) return new Date(value);

           if(typeof value === 'object') return JSON.stringify(value);

           return value;
       });

       return mapKeys(transform, (_value, key) => snakeCase(key));
   }
}