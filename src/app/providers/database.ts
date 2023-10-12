import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
	CapacitorSQLite,
	SQLiteDBConnection,
	SQLiteConnection,
	capSQLiteSet,
	capSQLiteChanges,
	capSQLiteValues,
	capEchoResult,
	capSQLiteResult,
	capNCDatabasePathResult,
} from '@capacitor-community/sqlite';
import { SqlCache } from '../models/sqlCache';

@Injectable({
	providedIn: 'root',
})
export class DatabaseProvider {
	private isWeb: boolean = false;
	private readonly sqlite: SQLiteConnection;
	private _db: SQLiteDBConnection | null = null;

	private readonly db_name = 'rgresp-sqlite';
	private readonly cache_table = 'cache';

	constructor() {}

	public async initialize() {
		if (this.isWeb) {
			if (!document.querySelector(this.db_name)) {
				const jeepSqlite = document.createElement(this.db_name);
				document.body.appendChild(jeepSqlite);
				await customElements.whenDefined(this.db_name);
			}

			await this.sqlite.initWebStore();
		}
		try {
			this._db = await this.sqlite.createConnection(
				this.db_name,
				false,
				'no-encryption',
				1
			);

			if (this._db === null) {
				console.log(`database.service initialize Error: _db is null`);
			}
			console.log(`$$$ initialize createConnection successful`);

			await this.ensureTablesExist();
			console.log(`$$$ initialize successful`);
		} catch (err) {
			console.log(`database.service initialize Error: ${JSON.stringify(err)}`);
		}
	}

	private async deleteDb() {
		try {
			if (this._db !== null) {
				await this._db.close();
				console.log(`$$$ deleteDb close successful`);
				await this._db.delete();
				console.log(`$$$ deleteDb successful`);
			} else {
				console.log(`database.service deleteDb Error: _db is null`);
			}
		} catch (err) {
			console.log(`database.service deleteDb Error: ${JSON.stringify(err)}`);
		}
	}

	public async getCacheItemByKey(cacheKey: string): Promise<SqlCache> {
		let ret = await this._db.query(`SELECT * FROM ${this.cache_table} WHERE cacheKey = ?;`, [cacheKey]);
		if (ret && ret.values && ret.values.length > 0) {
			let cacheItem = new SqlCache();
			cacheItem.id = ret.values[0].id;
			cacheItem.cacheKey = ret.values[0].cacheKey;
			cacheItem.expiresOn = new Date(ret.values[0].expiresOn);
			cacheItem.data = ret.values[0].data;

			return cacheItem;
		} else {
			return Promise.reject(new Error('getCacheItemByKey Query failed'));
		}
	}

	public async insertCacheItem(cacheKey: string, expiresOn: Date, data: string): Promise<boolean> {
		let sqlcmd: string = `INSERT INTO ${this.cache_table} (cacheKey,expiresOn,data) VALUES (?,?,?)`;
		let values: Array<any> = [cacheKey, expiresOn, data];
		let ret = await this._db.run(sqlcmd, values);
		
		if (!ret.changes.lastId) {
		  return Promise.reject(new Error('Insert cache item failed'));
		}
	}

	public async deleteCacheItem(cacheKey: string): Promise<void> {
		try {
			let res = await this._db.execute(`DELETE FROM ${this.cache_table} WHERE cacheKey = '${cacheKey}';`);
		} catch (err) {
			console.log(
				`database.service ensureTablesExist Error: ${JSON.stringify(err)}`
			);
		}
	}

	private async ensureTablesExist(): Promise<void> {
		try {
			if (this._db !== null) {
				await this._db.open();
				await this._db.execute(`PRAGMA journal_mode=WAL;`, false);
				await this._db.execute(
					`CREATE TABLE IF NOT EXISTS ${this.cache_table} (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, cacheKey text, expiresOn DATETIME DEFAULT (datetime('now', 'localtime'), data TEXT);`
				);
				console.log(`$$$ ensureTablesExist successful`);
			} else {
				console.log(`database.service ensureTablesExist Error: _db is null`);
			}
		} catch (err) {
			console.log(
				`database.service ensureTablesExist Error: ${JSON.stringify(err)}`
			);
		}
	}
}
