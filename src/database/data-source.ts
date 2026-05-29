import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

export default new DataSource(typeOrmConfig as DataSourceOptions);
