/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("@nestjs/core");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("@nestjs/common");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("@nestjs/config");

/***/ }),
/* 4 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AppModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const graphql_1 = __webpack_require__(5);
const apollo_1 = __webpack_require__(6);
const throttler_1 = __webpack_require__(7);
const schedule_1 = __webpack_require__(8);
const path_1 = __webpack_require__(9);
const prisma_module_1 = __webpack_require__(10);
const redis_module_1 = __webpack_require__(13);
const auth_module_1 = __webpack_require__(16);
const chat_module_1 = __webpack_require__(25);
const socket_module_1 = __webpack_require__(40);
const common_module_1 = __webpack_require__(34);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
                    limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
                },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/schema.gql'),
                sortSchema: true,
                playground: process.env.NODE_ENV === 'development',
                introspection: true,
                subscriptions: {
                    'graphql-ws': true,
                    'subscriptions-transport-ws': true,
                },
                context: ({ req, connection }) => {
                    if (connection) {
                        return { req: connection.context };
                    }
                    return { req };
                },
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            chat_module_1.ChatModule,
            socket_module_1.SocketModule,
        ],
    })
], AppModule);


/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("@nestjs/graphql");

/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("@nestjs/apollo");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("@nestjs/throttler");

/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("@nestjs/schedule");

/***/ }),
/* 9 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 10 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PrismaModule = void 0;
const common_1 = __webpack_require__(2);
const prisma_service_1 = __webpack_require__(11);
let PrismaModule = class PrismaModule {
};
exports.PrismaModule = PrismaModule;
exports.PrismaModule = PrismaModule = __decorate([
    (0, common_1.Module)({
        providers: [prisma_service_1.PrismaService],
        exports: [prisma_service_1.PrismaService],
    })
], PrismaModule);


/***/ }),
/* 11 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PrismaService = void 0;
const common_1 = __webpack_require__(2);
const client_1 = __webpack_require__(12);
let PrismaService = class PrismaService extends client_1.PrismaClient {
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async enableShutdownHooks(app) {
        this.$on('beforeExit', async () => {
            await app.close();
        });
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production')
            return;
        const tablenames = await this.$queryRaw `
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
        const tables = tablenames
            .map(({ tablename }) => tablename)
            .filter((name) => name !== '_prisma_migrations')
            .map((name) => `"public"."${name}"`)
            .join(', ');
        try {
            await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
        }
        catch (error) {
            console.log({ error });
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)()
], PrismaService);


/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),
/* 13 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RedisModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const redis_service_1 = __webpack_require__(14);
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Module)({
        providers: [redis_service_1.RedisService, config_1.ConfigService],
        exports: [redis_service_1.RedisService],
    })
], RedisModule);


/***/ }),
/* 14 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RedisService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const ioredis_1 = __webpack_require__(15);
let RedisService = class RedisService {
    constructor(configService) {
        this.configService = configService;
        const redisConfig = {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(this.configService.get('REDIS_PORT', '6379')),
            password: this.configService.get('REDIS_PASSWORD'),
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        };
        this.client = new ioredis_1.default(redisConfig);
        this.subscriber = new ioredis_1.default(redisConfig);
        this.publisher = new ioredis_1.default(redisConfig);
        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        this.client.on('connect', () => {
            console.log('✅ Connected to Redis');
        });
    }
    onModuleDestroy() {
        this.client.disconnect();
        this.subscriber.disconnect();
        this.publisher.disconnect();
    }
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    getPublisher() {
        return this.publisher;
    }
    async setSession(key, value, ttl) {
        const serialized = JSON.stringify(value);
        if (ttl) {
            await this.client.setex(key, ttl, serialized);
        }
        else {
            await this.client.set(key, serialized);
        }
    }
    async getSession(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }
    async deleteSession(key) {
        await this.client.del(key);
    }
    async set(key, value, ttl) {
        const serialized = JSON.stringify(value);
        if (ttl) {
            await this.client.setex(key, ttl, serialized);
        }
        else {
            await this.client.set(key, serialized);
        }
    }
    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }
    async del(key) {
        await this.client.del(key);
    }
    async lpush(key, ...values) {
        return this.client.lpush(key, ...values);
    }
    async lrange(key, start, stop) {
        return this.client.lrange(key, start, stop);
    }
    async ltrim(key, start, stop) {
        await this.client.ltrim(key, start, stop);
    }
    async publish(channel, message) {
        return this.publisher.publish(channel, message);
    }
    async subscribe(channel, callback) {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (receivedChannel, message) => {
            if (receivedChannel === channel) {
                callback(message);
            }
        });
    }
    async unsubscribe(channel) {
        await this.subscriber.unsubscribe(channel);
    }
    async addToSet(key, value) {
        await this.client.sadd(key, value);
    }
    async removeFromSet(key, value) {
        await this.client.srem(key, value);
    }
    async getSetMembers(key) {
        return this.client.smembers(key);
    }
    async isSetMember(key, value) {
        const result = await this.client.sismember(key, value);
        return result === 1;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], RedisService);


/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("ioredis");

/***/ }),
/* 16 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthModule = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const jwt_1 = __webpack_require__(17);
const passport_1 = __webpack_require__(18);
const auth_service_1 = __webpack_require__(19);
const auth_resolver_1 = __webpack_require__(20);
const jwt_strategy_1 = __webpack_require__(23);
const jwt_auth_guard_1 = __webpack_require__(21);
const prisma_module_1 = __webpack_require__(10);
const redis_module_1 = __webpack_require__(13);
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [auth_service_1.AuthService, auth_resolver_1.AuthResolver, jwt_strategy_1.JwtStrategy, jwt_auth_guard_1.JwtAuthGuard],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard],
    })
], AuthModule);


/***/ }),
/* 17 */
/***/ ((module) => {

module.exports = require("@nestjs/jwt");

/***/ }),
/* 18 */
/***/ ((module) => {

module.exports = require("@nestjs/passport");

/***/ }),
/* 19 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthService = void 0;
const common_1 = __webpack_require__(2);
const jwt_1 = __webpack_require__(17);
const config_1 = __webpack_require__(3);
const prisma_service_1 = __webpack_require__(11);
const redis_service_1 = __webpack_require__(14);
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService, redisService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.redisService = redisService;
    }
    async validateUser(payload) {
        try {
            const sessionKey = `session:${payload.sub}`;
            const session = await this.redisService.getSession(sessionKey);
            if (!session) {
                throw new common_1.UnauthorizedException('Session expired');
            }
            let user = await this.prisma.user.findUnique({
                where: { bankingId: payload.bankingId },
            });
            if (!user) {
                user = await this.prisma.user.create({
                    data: {
                        bankingId: payload.bankingId,
                        email: payload.email,
                        name: payload.name,
                        role: payload.role,
                    },
                });
            }
            else {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        email: payload.email,
                        name: payload.name,
                        role: payload.role,
                    },
                });
            }
            return user;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async createSession(user, token) {
        const sessionKey = `session:${user.id}`;
        const expiresIn = parseInt(this.configService.get('JWT_EXPIRES_IN', '86400'));
        await this.redisService.setSession(sessionKey, {
            userId: user.id,
            email: user.email,
            role: user.role,
            token,
        }, expiresIn);
        await this.prisma.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + expiresIn * 1000),
            },
        });
    }
    async revokeSession(userId) {
        const sessionKey = `session:${userId}`;
        await this.redisService.deleteSession(sessionKey);
        await this.prisma.session.deleteMany({
            where: { userId },
        });
    }
    async validateToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async refreshUserData(bankingId) {
        const user = await this.prisma.user.findUnique({
            where: { bankingId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async setUserOnline(userId) {
        await this.redisService.addToSet('online_users', userId);
    }
    async setUserOffline(userId) {
        await this.redisService.removeFromSet('online_users', userId);
    }
    async isUserOnline(userId) {
        return this.redisService.isSetMember('online_users', userId);
    }
    async getOnlineUsers() {
        return this.redisService.getSetMembers('online_users');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, typeof (_b = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _b : Object, typeof (_c = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _c : Object, typeof (_d = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _d : Object])
], AuthService);


/***/ }),
/* 20 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthResolver = void 0;
const graphql_1 = __webpack_require__(5);
const common_1 = __webpack_require__(2);
const auth_service_1 = __webpack_require__(19);
const jwt_auth_guard_1 = __webpack_require__(21);
const current_user_decorator_1 = __webpack_require__(22);
const client_1 = __webpack_require__(12);
let AuthResolver = class AuthResolver {
    constructor(authService) {
        this.authService = authService;
    }
    async me(user) {
        return user;
    }
    async logout(user) {
        await this.authService.revokeSession(user.id);
        await this.authService.setUserOffline(user.id);
        return true;
    }
    async onlineUsers() {
        return this.authService.getOnlineUsers();
    }
};
exports.AuthResolver = AuthResolver;
__decorate([
    (0, graphql_1.Query)(() => client_1.Prisma.User),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _b : Object]),
    __metadata("design:returntype", typeof (_c = typeof Promise !== "undefined" && Promise) === "function" ? _c : Object)
], AuthResolver.prototype, "me", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _d : Object]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], AuthResolver.prototype, "logout", null);
__decorate([
    (0, graphql_1.Query)(() => [String]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], AuthResolver.prototype, "onlineUsers", null);
exports.AuthResolver = AuthResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [typeof (_a = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _a : Object])
], AuthResolver);


/***/ }),
/* 21 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtAuthGuard = void 0;
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(18);
const graphql_1 = __webpack_require__(5);
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    getRequest(context) {
        const ctx = graphql_1.GqlExecutionContext.create(context);
        return ctx.getContext().req;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);


/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CurrentUser = void 0;
const common_1 = __webpack_require__(2);
const graphql_1 = __webpack_require__(5);
exports.CurrentUser = (0, common_1.createParamDecorator)((data, context) => {
    const ctx = graphql_1.GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
});


/***/ }),
/* 23 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JwtStrategy = void 0;
const common_1 = __webpack_require__(2);
const passport_1 = __webpack_require__(18);
const passport_jwt_1 = __webpack_require__(24);
const config_1 = __webpack_require__(3);
const auth_service_1 = __webpack_require__(19);
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    constructor(configService, authService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
        this.configService = configService;
        this.authService = authService;
    }
    async validate(payload) {
        const user = await this.authService.validateUser(payload);
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, typeof (_b = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _b : Object])
], JwtStrategy);


/***/ }),
/* 24 */
/***/ ((module) => {

module.exports = require("passport-jwt");

/***/ }),
/* 25 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatModule = void 0;
const common_1 = __webpack_require__(2);
const chat_service_1 = __webpack_require__(26);
const chat_resolver_1 = __webpack_require__(28);
const message_service_1 = __webpack_require__(32);
const agent_service_1 = __webpack_require__(33);
const prisma_module_1 = __webpack_require__(10);
const redis_module_1 = __webpack_require__(13);
const auth_module_1 = __webpack_require__(16);
const common_module_1 = __webpack_require__(34);
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule, auth_module_1.AuthModule, common_module_1.CommonModule],
        providers: [chat_service_1.ChatService, chat_resolver_1.ChatResolver, message_service_1.MessageService, agent_service_1.AgentService],
        exports: [chat_service_1.ChatService, message_service_1.MessageService, agent_service_1.AgentService],
    })
], ChatModule);


/***/ }),
/* 26 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatService = void 0;
const common_1 = __webpack_require__(2);
const prisma_service_1 = __webpack_require__(11);
const redis_service_1 = __webpack_require__(14);
const notification_service_1 = __webpack_require__(27);
const client_1 = __webpack_require__(12);
let ChatService = class ChatService {
    constructor(prisma, redisService, notificationService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.notificationService = notificationService;
    }
    async createChatRoom(input) {
        try {
            const customer = await this.prisma.user.findUnique({
                where: { id: input.customerId },
            });
            if (!customer || customer.role !== client_1.UserRole.CUSTOMER) {
                throw new common_1.BadRequestException('Invalid customer');
            }
            const chatRoom = await this.prisma.chatRoom.create({
                data: {
                    title: input.title || `Support Chat - ${customer.name}`,
                    status: client_1.ChatStatus.WAITING,
                    priority: input.priority || 0,
                    participants: {
                        create: {
                            userId: input.customerId,
                            joinedAt: new Date(),
                        },
                    },
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                },
            });
            await this.addToAgentQueue(chatRoom.id);
            await this.notifyAvailableAgents(chatRoom);
            await this.redisService.set(`chat:${chatRoom.id}`, chatRoom, 3600);
            return chatRoom;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to create chat room: ${error.message}`);
        }
    }
    async getChatRoom(id, userId) {
        try {
            const cached = await this.redisService.get(`chat:${id}`);
            if (cached) {
                if (await this.userHasAccessToChat(id, userId)) {
                    return cached;
                }
                throw new common_1.ForbiddenException('Access denied to this chat');
            }
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                        include: {
                            sender: true,
                        },
                    },
                },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            if (!(await this.userHasAccessToChat(id, userId))) {
                throw new common_1.ForbiddenException('Access denied to this chat');
            }
            await this.redisService.set(`chat:${id}`, chatRoom, 3600);
            return chatRoom;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get chat room: ${error.message}`);
        }
    }
    async getUserChatRooms(userId, status) {
        try {
            const whereClause = {
                participants: {
                    some: {
                        userId,
                    },
                },
            };
            if (status) {
                whereClause.status = status;
            }
            const chatRooms = await this.prisma.chatRoom.findMany({
                where: whereClause,
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            sender: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            });
            return chatRooms;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get user chat rooms: ${error.message}`);
        }
    }
    async joinChatRoom(input) {
        try {
            const { chatRoomId, userId } = input;
            const existingParticipant = await this.prisma.userChatRoom.findUnique({
                where: {
                    userId_chatRoomId: {
                        userId,
                        chatRoomId,
                    },
                },
            });
            if (existingParticipant && !existingParticipant.leftAt) {
                throw new common_1.BadRequestException('User already in chat room');
            }
            if (existingParticipant) {
                await this.prisma.userChatRoom.update({
                    where: { id: existingParticipant.id },
                    data: {
                        leftAt: null,
                        joinedAt: new Date(),
                        unreadCount: 0,
                    },
                });
            }
            else {
                await this.prisma.userChatRoom.create({
                    data: {
                        userId,
                        chatRoomId,
                        joinedAt: new Date(),
                    },
                });
            }
            await this.redisService.del(`chat:${chatRoomId}`);
            const chatRoom = await this.getChatRoom(chatRoomId, userId);
            return chatRoom;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to join chat room: ${error.message}`);
        }
    }
    async leaveChatRoom(chatRoomId, userId) {
        try {
            const participant = await this.prisma.userChatRoom.findUnique({
                where: {
                    userId_chatRoomId: {
                        userId,
                        chatRoomId,
                    },
                },
            });
            if (!participant) {
                throw new common_1.NotFoundException('User not in chat room');
            }
            await this.prisma.userChatRoom.update({
                where: { id: participant.id },
                data: {
                    leftAt: new Date(),
                },
            });
            await this.redisService.del(`chat:${chatRoomId}`);
            return true;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to leave chat room: ${error.message}`);
        }
    }
    async closeChatRoom(input) {
        try {
            const { chatRoomId, userId } = input;
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id: chatRoomId },
                include: {
                    assignedTo: true,
                    participants: true,
                },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            if (user?.role !== client_1.UserRole.ADMIN &&
                chatRoom.assignedToId !== userId) {
                throw new common_1.ForbiddenException('Only assigned agent or admin can close chat');
            }
            const updatedChatRoom = await this.prisma.chatRoom.update({
                where: { id: chatRoomId },
                data: {
                    status: client_1.ChatStatus.CLOSED,
                    closedAt: new Date(),
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                },
            });
            await this.removeFromAgentQueue(chatRoomId);
            await this.redisService.del(`chat:${chatRoomId}`);
            await this.notifyChatClosed(updatedChatRoom);
            return updatedChatRoom;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to close chat room: ${error.message}`);
        }
    }
    async transferChat(input) {
        try {
            const { chatRoomId, fromAgentId, toAgentId } = input;
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id: chatRoomId },
                include: {
                    assignedTo: true,
                },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            if (chatRoom.assignedToId !== fromAgentId) {
                throw new common_1.ForbiddenException('Only assigned agent can transfer chat');
            }
            const targetAgent = await this.prisma.user.findUnique({
                where: { id: toAgentId },
                include: {
                    agentStatus: true,
                },
            });
            if (!targetAgent || targetAgent.role !== client_1.UserRole.AGENT) {
                throw new common_1.BadRequestException('Invalid target agent');
            }
            if (targetAgent.agentStatus?.status !== 'AVAILABLE') {
                throw new common_1.BadRequestException('Target agent is not available');
            }
            const updatedChatRoom = await this.prisma.chatRoom.update({
                where: { id: chatRoomId },
                data: {
                    assignedToId: toAgentId,
                    status: client_1.ChatStatus.TRANSFERRED,
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                },
            });
            await this.updateAgentChatCount(fromAgentId, -1);
            await this.updateAgentChatCount(toAgentId, 1);
            await this.redisService.del(`chat:${chatRoomId}`);
            await this.notifyChatTransferred(updatedChatRoom, fromAgentId, toAgentId);
            return updatedChatRoom;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to transfer chat: ${error.message}`);
        }
    }
    async getAgentQueue() {
        try {
            const waitingChats = await this.prisma.chatRoom.findMany({
                where: {
                    status: client_1.ChatStatus.WAITING,
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            sender: true,
                        },
                    },
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' },
                ],
            });
            return waitingChats;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get agent queue: ${error.message}`);
        }
    }
    async userHasAccessToChat(chatRoomId, userId) {
        const participant = await this.prisma.userChatRoom.findUnique({
            where: {
                userId_chatRoomId: {
                    userId,
                    chatRoomId,
                },
            },
        });
        return !!participant;
    }
    async addToAgentQueue(chatRoomId) {
        await this.redisService.lpush('agent_queue', chatRoomId);
    }
    async removeFromAgentQueue(chatRoomId) {
        const queue = await this.redisService.lrange('agent_queue', 0, -1);
        const filteredQueue = queue.filter(id => id !== chatRoomId);
        await this.redisService.del('agent_queue');
        if (filteredQueue.length > 0) {
            await this.redisService.lpush('agent_queue', ...filteredQueue);
        }
    }
    async notifyAvailableAgents(chatRoom) {
        const availableAgents = await this.prisma.user.findMany({
            where: {
                role: client_1.UserRole.AGENT,
                agentStatus: {
                    status: 'AVAILABLE',
                },
            },
        });
        for (const agent of availableAgents) {
            await this.notificationService.sendNotification({
                userId: agent.id,
                type: 'NEW_CHAT',
                title: 'New Chat Request',
                message: `New support request from ${chatRoom.participants?.[0]?.user?.name || 'Customer'}`,
                data: { chatRoomId: chatRoom.id },
            });
        }
    }
    async notifyChatClosed(chatRoom) {
        for (const participant of chatRoom.participants || []) {
            if (participant.user.role === client_1.UserRole.CUSTOMER) {
                await this.notificationService.sendNotification({
                    userId: participant.user.id,
                    type: 'CHAT_CLOSED',
                    title: 'Chat Closed',
                    message: 'Your support chat has been closed',
                    data: { chatRoomId: chatRoom.id },
                });
            }
        }
    }
    async notifyChatTransferred(chatRoom, fromAgentId, toAgentId) {
        await this.notificationService.sendNotification({
            userId: toAgentId,
            type: 'CHAT_TRANSFERRED',
            title: 'Chat Transferred',
            message: `Chat transferred to you from another agent`,
            data: { chatRoomId: chatRoom.id },
        });
        await this.notificationService.sendNotification({
            userId: fromAgentId,
            type: 'CHAT_TRANSFERRED',
            title: 'Chat Transferred',
            message: `Chat successfully transferred`,
            data: { chatRoomId: chatRoom.id },
        });
    }
    async updateAgentChatCount(agentId, delta) {
        await this.prisma.agentStatus.update({
            where: { agentId },
            data: {
                currentChats: {
                    increment: delta,
                },
            },
        });
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, typeof (_b = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _b : Object, typeof (_c = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _c : Object])
], ChatService);


/***/ }),
/* 27 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotificationService = void 0;
const common_1 = __webpack_require__(2);
const redis_service_1 = __webpack_require__(14);
let NotificationService = class NotificationService {
    constructor(redisService) {
        this.redisService = redisService;
    }
    async sendNotification(payload) {
        try {
            const notificationKey = `notifications:${payload.userId}`;
            const notification = {
                id: Date.now().toString(),
                ...payload,
                createdAt: new Date().toISOString(),
                read: false,
            };
            await this.redisService.lpush(notificationKey, JSON.stringify(notification));
            await this.redisService.ltrim(notificationKey, 0, 49);
            await this.redisService.publish(`user:${payload.userId}:notifications`, JSON.stringify(notification));
        }
        catch (error) {
            console.error('Error sending notification:', error);
        }
    }
    async getNotifications(userId, limit = 20) {
        try {
            const notificationKey = `notifications:${userId}`;
            const notifications = await this.redisService.lrange(notificationKey, 0, limit - 1);
            return notifications.map(n => JSON.parse(n));
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }
    async markAsRead(userId, notificationId) {
        try {
            const notificationKey = `notifications:${userId}`;
            const notifications = await this.redisService.lrange(notificationKey, 0, -1);
            const updatedNotifications = notifications.map(n => {
                const notification = JSON.parse(n);
                if (notification.id === notificationId) {
                    notification.read = true;
                }
                return JSON.stringify(notification);
            });
            await this.redisService.del(notificationKey);
            if (updatedNotifications.length > 0) {
                await this.redisService.lpush(notificationKey, ...updatedNotifications);
            }
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _a : Object])
], NotificationService);


/***/ }),
/* 28 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatResolver = void 0;
const graphql_1 = __webpack_require__(5);
const common_1 = __webpack_require__(2);
const graphql_subscriptions_1 = __webpack_require__(29);
const jwt_auth_guard_1 = __webpack_require__(21);
const roles_guard_1 = __webpack_require__(30);
const roles_decorator_1 = __webpack_require__(31);
const current_user_decorator_1 = __webpack_require__(22);
const chat_service_1 = __webpack_require__(26);
const message_service_1 = __webpack_require__(32);
const agent_service_1 = __webpack_require__(33);
const client_1 = __webpack_require__(12);
const pubSub = new graphql_subscriptions_1.PubSub();
let ChatResolver = class ChatResolver {
    constructor(chatService, messageService, agentService) {
        this.chatService = chatService;
        this.messageService = messageService;
        this.agentService = agentService;
    }
    async myChatRooms(user, status) {
        return this.chatService.getUserChatRooms(user.id, status);
    }
    async chatRoom(id, user) {
        return this.chatService.getChatRoom(id, user.id);
    }
    async messages(chatRoomId, limit, offset, cursor, user) {
        const result = await this.messageService.getMessages({
            chatRoomId,
            userId: user.id,
            limit: limit || 50,
            offset: offset || 0,
            cursor,
        });
        return result.messages;
    }
    async agentQueue() {
        return this.chatService.getAgentQueue();
    }
    async myAssignedChats(user) {
        return this.agentService.getAgentChats(user.id);
    }
    async availableAgents() {
        return this.agentService.getAvailableAgents();
    }
    async agentStatus(agentId, user) {
        const targetAgentId = agentId || user?.id;
        if (!targetAgentId) {
            throw new common_1.BadRequestException('Agent ID is required');
        }
        return this.agentService.getAgentStatus(targetAgentId);
    }
    async unreadCount(chatRoomId, user) {
        return this.messageService.getUnreadCount(chatRoomId, user.id);
    }
    async createChatRoom(title, priority, user) {
        return this.chatService.createChatRoom({
            title,
            customerId: user.id,
            priority: priority || 0,
        });
    }
    async joinChatRoom(chatRoomId, user) {
        const chatRoom = await this.chatService.joinChatRoom({
            chatRoomId,
            userId: user.id,
        });
        pubSub.publish('userJoinedChat', {
            userJoinedChat: {
                chatRoomId,
                user,
                joinedAt: new Date(),
            },
        });
        return chatRoom;
    }
    async leaveChatRoom(chatRoomId, user) {
        const result = await this.chatService.leaveChatRoom(chatRoomId, user.id);
        pubSub.publish('userLeftChat', {
            userLeftChat: {
                chatRoomId,
                user,
                leftAt: new Date(),
            },
        });
        return result;
    }
    async sendMessage(chatRoomId, content, type, fileUrl, fileName, fileSize, user) {
        const message = await this.messageService.sendMessage({
            chatRoomId,
            senderId: user.id,
            content,
            type: type || client_1.MessageType.TEXT,
            fileUrl,
            fileName,
            fileSize,
        });
        pubSub.publish('messageAdded', {
            messageAdded: message,
        });
        return message;
    }
    async updateMessage(messageId, content, user) {
        const message = await this.messageService.updateMessage({
            messageId,
            content,
            userId: user.id,
        });
        pubSub.publish('messageUpdated', {
            messageUpdated: message,
        });
        return message;
    }
    async deleteMessage(messageId, user) {
        const result = await this.messageService.deleteMessage({
            messageId,
            userId: user.id,
        });
        pubSub.publish('messageDeleted', {
            messageDeleted: {
                messageId,
                deletedBy: user.id,
                deletedAt: new Date(),
            },
        });
        return result;
    }
    async markMessagesAsRead(chatRoomId, lastReadMessageId, user) {
        return this.messageService.markMessagesAsRead(chatRoomId, user.id, lastReadMessageId);
    }
    async assignChatToAgent(chatRoomId, agentId, user) {
        const targetAgentId = agentId || user?.id;
        if (!targetAgentId) {
            throw new common_1.BadRequestException('Agent ID is required');
        }
        const chatRoom = await this.agentService.assignChatToAgent({
            chatRoomId,
            agentId: targetAgentId,
        });
        pubSub.publish('chatAssigned', {
            chatAssigned: chatRoom,
        });
        return chatRoom;
    }
    async transferChat(chatRoomId, toAgentId, user) {
        const chatRoom = await this.chatService.transferChat({
            chatRoomId,
            fromAgentId: user.id,
            toAgentId,
        });
        pubSub.publish('chatTransferred', {
            chatTransferred: chatRoom,
        });
        return chatRoom;
    }
    async closeChatRoom(chatRoomId, user) {
        const chatRoom = await this.chatService.closeChatRoom({
            chatRoomId,
            userId: user.id,
        });
        pubSub.publish('chatClosed', {
            chatClosed: chatRoom,
        });
        return chatRoom;
    }
    async updateAgentStatus(status, statusMessage, maxChats, user) {
        const agentStatus = await this.agentService.updateAgentStatus({
            agentId: user.id,
            status,
            statusMessage,
            maxChats,
        });
        pubSub.publish('agentStatusChanged', {
            agentStatusChanged: agentStatus,
        });
        return agentStatus;
    }
    async autoAssignNextChat() {
        const chatRoom = await this.agentService.autoAssignNextChat();
        if (chatRoom) {
            pubSub.publish('chatAssigned', {
                chatAssigned: chatRoom,
            });
        }
        return chatRoom;
    }
    messageAdded(chatRoomId) {
        return pubSub.asyncIterator('messageAdded');
    }
    messageUpdated(chatRoomId) {
        return pubSub.asyncIterator('messageUpdated');
    }
    messageDeleted(chatRoomId) {
        return pubSub.asyncIterator('messageDeleted');
    }
    userJoinedChat(chatRoomId) {
        return pubSub.asyncIterator('userJoinedChat');
    }
    userLeftChat(chatRoomId) {
        return pubSub.asyncIterator('userLeftChat');
    }
    typingEvent(chatRoomId, excludeUserId) {
        return pubSub.asyncIterator('typingEvent');
    }
    chatAssigned() {
        return pubSub.asyncIterator('chatAssigned');
    }
    chatTransferred() {
        return pubSub.asyncIterator('chatTransferred');
    }
    chatClosed(chatRoomId) {
        return pubSub.asyncIterator('chatClosed');
    }
    agentStatusChanged() {
        return pubSub.asyncIterator('agentStatusChanged');
    }
    static publishTypingEvent(event) {
        pubSub.publish('typingEvent', { typingEvent: event });
    }
};
exports.ChatResolver = ChatResolver;
__decorate([
    (0, graphql_1.Query)(() => [client_1.ChatRoom]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, graphql_1.Args)('status', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_d = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _d : Object, typeof (_e = typeof client_1.ChatStatus !== "undefined" && client_1.ChatStatus) === "function" ? _e : Object]),
    __metadata("design:returntype", typeof (_f = typeof Promise !== "undefined" && Promise) === "function" ? _f : Object)
], ChatResolver.prototype, "myChatRooms", null);
__decorate([
    (0, graphql_1.Query)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_g = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _g : Object]),
    __metadata("design:returntype", typeof (_h = typeof Promise !== "undefined" && Promise) === "function" ? _h : Object)
], ChatResolver.prototype, "chatRoom", null);
__decorate([
    (0, graphql_1.Query)(() => [client_1.Message]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('limit', { nullable: true, type: () => common_1.ParseIntPipe })),
    __param(2, (0, graphql_1.Args)('offset', { nullable: true, type: () => common_1.ParseIntPipe })),
    __param(3, (0, graphql_1.Args)('cursor', { nullable: true })),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, typeof (_j = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _j : Object]),
    __metadata("design:returntype", typeof (_k = typeof Promise !== "undefined" && Promise) === "function" ? _k : Object)
], ChatResolver.prototype, "messages", null);
__decorate([
    (0, graphql_1.Query)(() => [client_1.ChatRoom]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", typeof (_l = typeof Promise !== "undefined" && Promise) === "function" ? _l : Object)
], ChatResolver.prototype, "agentQueue", null);
__decorate([
    (0, graphql_1.Query)(() => [client_1.ChatRoom]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_m = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _m : Object]),
    __metadata("design:returntype", typeof (_o = typeof Promise !== "undefined" && Promise) === "function" ? _o : Object)
], ChatResolver.prototype, "myAssignedChats", null);
__decorate([
    (0, graphql_1.Query)(() => [client_1.AgentStatus]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", typeof (_p = typeof Promise !== "undefined" && Promise) === "function" ? _p : Object)
], ChatResolver.prototype, "availableAgents", null);
__decorate([
    (0, graphql_1.Query)(() => client_1.AgentStatus),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('agentId', { nullable: true })),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_q = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _q : Object]),
    __metadata("design:returntype", typeof (_r = typeof Promise !== "undefined" && Promise) === "function" ? _r : Object)
], ChatResolver.prototype, "agentStatus", null);
__decorate([
    (0, graphql_1.Query)(() => Number),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_s = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _s : Object]),
    __metadata("design:returntype", typeof (_t = typeof Promise !== "undefined" && Promise) === "function" ? _t : Object)
], ChatResolver.prototype, "unreadCount", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.CUSTOMER),
    __param(0, (0, graphql_1.Args)('title', { nullable: true })),
    __param(1, (0, graphql_1.Args)('priority', { nullable: true, type: () => common_1.ParseIntPipe })),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, typeof (_u = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _u : Object]),
    __metadata("design:returntype", typeof (_v = typeof Promise !== "undefined" && Promise) === "function" ? _v : Object)
], ChatResolver.prototype, "createChatRoom", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_w = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _w : Object]),
    __metadata("design:returntype", typeof (_x = typeof Promise !== "undefined" && Promise) === "function" ? _x : Object)
], ChatResolver.prototype, "joinChatRoom", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_y = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _y : Object]),
    __metadata("design:returntype", typeof (_z = typeof Promise !== "undefined" && Promise) === "function" ? _z : Object)
], ChatResolver.prototype, "leaveChatRoom", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.Message),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('content')),
    __param(2, (0, graphql_1.Args)('type', { nullable: true })),
    __param(3, (0, graphql_1.Args)('fileUrl', { nullable: true })),
    __param(4, (0, graphql_1.Args)('fileName', { nullable: true })),
    __param(5, (0, graphql_1.Args)('fileSize', { nullable: true, type: () => common_1.ParseIntPipe })),
    __param(6, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_0 = typeof client_1.MessageType !== "undefined" && client_1.MessageType) === "function" ? _0 : Object, String, String, Number, typeof (_1 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _1 : Object]),
    __metadata("design:returntype", typeof (_2 = typeof Promise !== "undefined" && Promise) === "function" ? _2 : Object)
], ChatResolver.prototype, "sendMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.Message),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('messageId')),
    __param(1, (0, graphql_1.Args)('content')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_3 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _3 : Object]),
    __metadata("design:returntype", typeof (_4 = typeof Promise !== "undefined" && Promise) === "function" ? _4 : Object)
], ChatResolver.prototype, "updateMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('messageId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_5 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _5 : Object]),
    __metadata("design:returntype", typeof (_6 = typeof Promise !== "undefined" && Promise) === "function" ? _6 : Object)
], ChatResolver.prototype, "deleteMessage", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('lastReadMessageId', { nullable: true })),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_7 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _7 : Object]),
    __metadata("design:returntype", typeof (_8 = typeof Promise !== "undefined" && Promise) === "function" ? _8 : Object)
], ChatResolver.prototype, "markMessagesAsRead", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('agentId', { nullable: true })),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_9 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _9 : Object]),
    __metadata("design:returntype", typeof (_10 = typeof Promise !== "undefined" && Promise) === "function" ? _10 : Object)
], ChatResolver.prototype, "assignChatToAgent", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('toAgentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_11 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _11 : Object]),
    __metadata("design:returntype", typeof (_12 = typeof Promise !== "undefined" && Promise) === "function" ? _12 : Object)
], ChatResolver.prototype, "transferChat", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_13 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _13 : Object]),
    __metadata("design:returntype", typeof (_14 = typeof Promise !== "undefined" && Promise) === "function" ? _14 : Object)
], ChatResolver.prototype, "closeChatRoom", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.AgentStatus),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT),
    __param(0, (0, graphql_1.Args)('status')),
    __param(1, (0, graphql_1.Args)('statusMessage', { nullable: true })),
    __param(2, (0, graphql_1.Args)('maxChats', { nullable: true, type: () => common_1.ParseIntPipe })),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_15 = typeof client_1.AgentStatusType !== "undefined" && client_1.AgentStatusType) === "function" ? _15 : Object, String, Number, typeof (_16 = typeof client_1.Prisma !== "undefined" && client_1.Prisma.User) === "function" ? _16 : Object]),
    __metadata("design:returntype", typeof (_17 = typeof Promise !== "undefined" && Promise) === "function" ? _17 : Object)
], ChatResolver.prototype, "updateAgentStatus", null);
__decorate([
    (0, graphql_1.Mutation)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", typeof (_18 = typeof Promise !== "undefined" && Promise) === "function" ? _18 : Object)
], ChatResolver.prototype, "autoAssignNextChat", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.Message, {
        filter: (payload, variables) => {
            return payload.messageAdded.chatRoomId === variables.chatRoomId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "messageAdded", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.Message, {
        filter: (payload, variables) => {
            return payload.messageUpdated.chatRoomId === variables.chatRoomId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "messageUpdated", null);
__decorate([
    (0, graphql_1.Subscription)(() => Object, {
        filter: (payload, variables) => {
            return payload.messageDeleted.chatRoomId === variables.chatRoomId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "messageDeleted", null);
__decorate([
    (0, graphql_1.Subscription)(() => Object, {
        filter: (payload, variables) => {
            return payload.userJoinedChat.chatRoomId === variables.chatRoomId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "userJoinedChat", null);
__decorate([
    (0, graphql_1.Subscription)(() => Object, {
        filter: (payload, variables) => {
            return payload.userLeftChat.chatRoomId === variables.chatRoomId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "userLeftChat", null);
__decorate([
    (0, graphql_1.Subscription)(() => Object, {
        filter: (payload, variables) => {
            const event = payload.typingEvent;
            return event.chatRoomId === variables.chatRoomId && event.userId !== variables.excludeUserId;
        },
    }),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __param(1, (0, graphql_1.Args)('excludeUserId', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "typingEvent", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "chatAssigned", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.ChatRoom),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "chatTransferred", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.ChatRoom),
    __param(0, (0, graphql_1.Args)('chatRoomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "chatClosed", null);
__decorate([
    (0, graphql_1.Subscription)(() => client_1.AgentStatus),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.UserRole.AGENT, client_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatResolver.prototype, "agentStatusChanged", null);
exports.ChatResolver = ChatResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [typeof (_a = typeof chat_service_1.ChatService !== "undefined" && chat_service_1.ChatService) === "function" ? _a : Object, typeof (_b = typeof message_service_1.MessageService !== "undefined" && message_service_1.MessageService) === "function" ? _b : Object, typeof (_c = typeof agent_service_1.AgentService !== "undefined" && agent_service_1.AgentService) === "function" ? _c : Object])
], ChatResolver);


/***/ }),
/* 29 */
/***/ ((module) => {

module.exports = require("graphql-subscriptions");

/***/ }),
/* 30 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RolesGuard = void 0;
const common_1 = __webpack_require__(2);
const core_1 = __webpack_require__(1);
const graphql_1 = __webpack_require__(5);
const roles_decorator_1 = __webpack_require__(31);
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const ctx = graphql_1.GqlExecutionContext.create(context);
        const user = ctx.getContext().req.user;
        if (!user) {
            return false;
        }
        return requiredRoles.some((role) => user.role === role);
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof core_1.Reflector !== "undefined" && core_1.Reflector) === "function" ? _a : Object])
], RolesGuard);


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = __webpack_require__(2);
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;


/***/ }),
/* 32 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageService = void 0;
const common_1 = __webpack_require__(2);
const prisma_service_1 = __webpack_require__(11);
const redis_service_1 = __webpack_require__(14);
const client_1 = __webpack_require__(12);
let MessageService = class MessageService {
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async sendMessage(input) {
        try {
            const { chatRoomId, senderId, content, type = client_1.MessageType.TEXT, fileUrl, fileName, fileSize } = input;
            if (!(await this.userHasAccessToChat(chatRoomId, senderId))) {
                throw new common_1.ForbiddenException('Access denied to this chat room');
            }
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id: chatRoomId },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            if (chatRoom.status === 'CLOSED') {
                throw new common_1.BadRequestException('Cannot send message to closed chat');
            }
            const message = await this.prisma.message.create({
                data: {
                    content,
                    type,
                    fileUrl,
                    fileName,
                    fileSize,
                    chatRoomId,
                    senderId,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            avatar: true,
                        },
                    },
                    chatRoom: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                        },
                    },
                },
            });
            await this.prisma.chatRoom.update({
                where: { id: chatRoomId },
                data: {
                    updatedAt: new Date(),
                    status: chatRoom.status === 'WAITING' ? 'ACTIVE' : chatRoom.status,
                },
            });
            await this.updateUnreadCounts(chatRoomId, senderId);
            await this.cacheRecentMessage(chatRoomId, message);
            await this.redisService.del(`chat:${chatRoomId}`);
            return message;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to send message: ${error.message}`);
        }
    }
    async updateMessage(input) {
        try {
            const { messageId, content, userId } = input;
            const message = await this.prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    sender: true,
                },
            });
            if (!message) {
                throw new common_1.NotFoundException('Message not found');
            }
            if (message.senderId !== userId) {
                throw new common_1.ForbiddenException('Can only edit your own messages');
            }
            if (message.deletedAt) {
                throw new common_1.BadRequestException('Cannot edit deleted message');
            }
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            if (message.createdAt < fifteenMinutesAgo) {
                throw new common_1.BadRequestException('Message can only be edited within 15 minutes');
            }
            const updatedMessage = await this.prisma.message.update({
                where: { id: messageId },
                data: {
                    content,
                    editedAt: new Date(),
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            avatar: true,
                        },
                    },
                },
            });
            await this.redisService.del(`chat:${message.chatRoomId}`);
            await this.redisService.del(`messages:${message.chatRoomId}`);
            return updatedMessage;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to update message: ${error.message}`);
        }
    }
    async deleteMessage(input) {
        try {
            const { messageId, userId } = input;
            const message = await this.prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    sender: true,
                },
            });
            if (!message) {
                throw new common_1.NotFoundException('Message not found');
            }
            if (message.senderId !== userId) {
                throw new common_1.ForbiddenException('Can only delete your own messages');
            }
            if (message.deletedAt) {
                throw new common_1.BadRequestException('Message already deleted');
            }
            await this.prisma.message.update({
                where: { id: messageId },
                data: {
                    deletedAt: new Date(),
                    content: '[Message deleted]',
                },
            });
            await this.redisService.del(`chat:${message.chatRoomId}`);
            await this.redisService.del(`messages:${message.chatRoomId}`);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to delete message: ${error.message}`);
        }
    }
    async getMessages(input) {
        try {
            const { chatRoomId, userId, limit = 50, offset = 0, cursor } = input;
            if (!(await this.userHasAccessToChat(chatRoomId, userId))) {
                throw new common_1.ForbiddenException('Access denied to this chat room');
            }
            if (!cursor && offset === 0) {
                const cached = await this.redisService.get(`messages:${chatRoomId}`);
                if (cached && cached.length >= limit) {
                    return {
                        messages: cached.slice(0, limit),
                        hasMore: cached.length > limit,
                    };
                }
            }
            let whereClause = {
                chatRoomId,
                deletedAt: null,
            };
            if (cursor) {
                whereClause.createdAt = {
                    lt: new Date(cursor),
                };
            }
            const messages = await this.prisma.message.findMany({
                where: whereClause,
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit + 1,
                skip: cursor ? 0 : offset,
            });
            const hasMore = messages.length > limit;
            const resultMessages = hasMore ? messages.slice(0, limit) : messages;
            if (!cursor && offset === 0) {
                await this.redisService.set(`messages:${chatRoomId}`, resultMessages, 300);
            }
            const nextCursor = hasMore && resultMessages.length > 0
                ? resultMessages[resultMessages.length - 1].createdAt.toISOString()
                : undefined;
            return {
                messages: resultMessages.reverse(),
                hasMore,
                cursor: nextCursor,
            };
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get messages: ${error.message}`);
        }
    }
    async markMessagesAsRead(chatRoomId, userId, lastReadMessageId) {
        try {
            if (!(await this.userHasAccessToChat(chatRoomId, userId))) {
                throw new common_1.ForbiddenException('Access denied to this chat room');
            }
            await this.prisma.userChatRoom.updateMany({
                where: {
                    chatRoomId,
                    userId,
                },
                data: {
                    lastReadAt: new Date(),
                    unreadCount: 0,
                },
            });
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to mark messages as read: ${error.message}`);
        }
    }
    async getUnreadCount(chatRoomId, userId) {
        try {
            const userChatRoom = await this.prisma.userChatRoom.findUnique({
                where: {
                    userId_chatRoomId: {
                        userId,
                        chatRoomId,
                    },
                },
            });
            return userChatRoom?.unreadCount || 0;
        }
        catch (error) {
            return 0;
        }
    }
    async userHasAccessToChat(chatRoomId, userId) {
        const participant = await this.prisma.userChatRoom.findUnique({
            where: {
                userId_chatRoomId: {
                    userId,
                    chatRoomId,
                },
            },
        });
        return !!participant && !participant.leftAt;
    }
    async updateUnreadCounts(chatRoomId, senderId) {
        const participants = await this.prisma.userChatRoom.findMany({
            where: {
                chatRoomId,
                userId: {
                    not: senderId,
                },
                leftAt: null,
            },
        });
        const updatePromises = participants.map(participant => this.prisma.userChatRoom.update({
            where: { id: participant.id },
            data: {
                unreadCount: {
                    increment: 1,
                },
            },
        }));
        await Promise.all(updatePromises);
    }
    async cacheRecentMessage(chatRoomId, message) {
        try {
            const cacheKey = `messages:${chatRoomId}`;
            const cached = await this.redisService.get(cacheKey) || [];
            cached.unshift(message);
            if (cached.length > 100) {
                cached.splice(100);
            }
            await this.redisService.set(cacheKey, cached, 300);
        }
        catch (error) {
            console.error('Failed to cache message:', error);
        }
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, typeof (_b = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _b : Object])
], MessageService);


/***/ }),
/* 33 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgentService = void 0;
const common_1 = __webpack_require__(2);
const prisma_service_1 = __webpack_require__(11);
const redis_service_1 = __webpack_require__(14);
const notification_service_1 = __webpack_require__(27);
const client_1 = __webpack_require__(12);
let AgentService = class AgentService {
    constructor(prisma, redisService, notificationService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.notificationService = notificationService;
    }
    async updateAgentStatus(input) {
        try {
            const { agentId, status, statusMessage, maxChats } = input;
            const agent = await this.prisma.user.findUnique({
                where: { id: agentId },
            });
            if (!agent || agent.role !== client_1.UserRole.AGENT) {
                throw new common_1.BadRequestException('Invalid agent');
            }
            let agentStatus = await this.prisma.agentStatus.findUnique({
                where: { agentId },
            });
            if (!agentStatus) {
                agentStatus = await this.prisma.agentStatus.create({
                    data: {
                        agentId,
                        status,
                        statusMessage,
                        maxChats: maxChats || 5,
                        lastActiveAt: new Date(),
                    },
                });
            }
            else {
                agentStatus = await this.prisma.agentStatus.update({
                    where: { agentId },
                    data: {
                        status,
                        statusMessage,
                        maxChats: maxChats !== undefined ? maxChats : agentStatus.maxChats,
                        lastActiveAt: new Date(),
                    },
                });
            }
            await this.redisService.set(`agent:${agentId}:status`, agentStatus, 3600);
            if (status === client_1.AgentStatusType.OFFLINE) {
                await this.redisService.removeFromSet('online_agents', agentId);
            }
            else {
                await this.redisService.addToSet('online_agents', agentId);
            }
            if (status === client_1.AgentStatusType.AVAILABLE) {
                await this.tryAssignWaitingChats(agentId);
            }
            return agentStatus;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to update agent status: ${error.message}`);
        }
    }
    async getAgentStatus(agentId) {
        try {
            const cached = await this.redisService.get(`agent:${agentId}:status`);
            if (cached) {
                return cached;
            }
            const agentStatus = await this.prisma.agentStatus.findUnique({
                where: { agentId },
                include: {
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
            });
            if (agentStatus) {
                await this.redisService.set(`agent:${agentId}:status`, agentStatus, 3600);
            }
            return agentStatus;
        }
        catch (error) {
            console.error('Failed to get agent status:', error);
            return null;
        }
    }
    async getAvailableAgents() {
        try {
            const availableAgents = await this.prisma.agentStatus.findMany({
                where: {
                    status: client_1.AgentStatusType.AVAILABLE,
                },
                include: {
                    agent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: [
                    { currentChats: 'asc' },
                    { lastActiveAt: 'desc' },
                ],
            });
            return availableAgents.filter(agent => agent.currentChats < agent.maxChats);
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get available agents: ${error.message}`);
        }
    }
    async assignChatToAgent(input) {
        try {
            const { chatRoomId, agentId } = input;
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id: chatRoomId },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            if (chatRoom.status !== client_1.ChatStatus.WAITING) {
                throw new common_1.BadRequestException('Chat is not waiting for assignment');
            }
            const agentStatus = await this.getAgentStatus(agentId);
            if (!agentStatus || agentStatus.status !== client_1.AgentStatusType.AVAILABLE) {
                throw new common_1.BadRequestException('Agent is not available');
            }
            if (agentStatus.currentChats >= agentStatus.maxChats) {
                throw new common_1.BadRequestException('Agent has reached maximum chat capacity');
            }
            const updatedChatRoom = await this.prisma.chatRoom.update({
                where: { id: chatRoomId },
                data: {
                    assignedToId: agentId,
                    status: client_1.ChatStatus.ACTIVE,
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    assignedTo: true,
                },
            });
            await this.prisma.userChatRoom.create({
                data: {
                    userId: agentId,
                    chatRoomId,
                    joinedAt: new Date(),
                },
            });
            await this.prisma.agentStatus.update({
                where: { agentId },
                data: {
                    currentChats: {
                        increment: 1,
                    },
                },
            });
            await this.removeFromAgentQueue(chatRoomId);
            await this.redisService.del(`chat:${chatRoomId}`);
            await this.redisService.del(`agent:${agentId}:status`);
            await this.notificationService.sendNotification({
                userId: agentId,
                type: 'CHAT_ASSIGNED',
                title: 'Chat Assigned',
                message: `New chat assigned from ${updatedChatRoom.participants?.[0]?.user?.name || 'Customer'}`,
                data: { chatRoomId },
            });
            const customer = updatedChatRoom.participants?.find(p => p.user.role === client_1.UserRole.CUSTOMER);
            if (customer) {
                await this.notificationService.sendNotification({
                    userId: customer.userId,
                    type: 'AGENT_ASSIGNED',
                    title: 'Agent Assigned',
                    message: `${updatedChatRoom.assignedTo?.name} is now helping you`,
                    data: { chatRoomId, agentName: updatedChatRoom.assignedTo?.name },
                });
            }
            return updatedChatRoom;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to assign chat to agent: ${error.message}`);
        }
    }
    async getAgentChats(agentId) {
        try {
            const agentChats = await this.prisma.chatRoom.findMany({
                where: {
                    assignedToId: agentId,
                    status: {
                        in: [client_1.ChatStatus.ACTIVE, client_1.ChatStatus.TRANSFERRED],
                    },
                },
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            sender: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            });
            return agentChats;
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get agent chats: ${error.message}`);
        }
    }
    async autoAssignNextChat() {
        try {
            const waitingChat = await this.prisma.chatRoom.findFirst({
                where: {
                    status: client_1.ChatStatus.WAITING,
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' },
                ],
                include: {
                    participants: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            if (!waitingChat) {
                return null;
            }
            const availableAgents = await this.getAvailableAgents();
            if (availableAgents.length === 0) {
                return null;
            }
            const bestAgent = availableAgents[0];
            return await this.assignChatToAgent({
                chatRoomId: waitingChat.id,
                agentId: bestAgent.agentId,
            });
        }
        catch (error) {
            console.error('Failed to auto-assign chat:', error);
            return null;
        }
    }
    async getAgentPerformanceStats(agentId, days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const totalChats = await this.prisma.chatRoom.count({
                where: {
                    assignedToId: agentId,
                    createdAt: {
                        gte: startDate,
                    },
                },
            });
            const resolvedChats = await this.prisma.chatRoom.count({
                where: {
                    assignedToId: agentId,
                    status: client_1.ChatStatus.CLOSED,
                    createdAt: {
                        gte: startDate,
                    },
                },
            });
            const ratings = await this.prisma.chatRating.findMany({
                where: {
                    chatRoom: {
                        assignedToId: agentId,
                        createdAt: {
                            gte: startDate,
                        },
                    },
                },
            });
            const customerSatisfaction = ratings.length > 0
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
                : 0;
            const avgResponseTime = 0;
            return {
                totalChats,
                avgResponseTime,
                customerSatisfaction,
                resolvedChats,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get agent performance stats: ${error.message}`);
        }
    }
    async tryAssignWaitingChats(agentId) {
        try {
            const agentStatus = await this.getAgentStatus(agentId);
            if (!agentStatus || agentStatus.currentChats >= agentStatus.maxChats) {
                return;
            }
            const availableSlots = agentStatus.maxChats - agentStatus.currentChats;
            const waitingChats = await this.prisma.chatRoom.findMany({
                where: {
                    status: client_1.ChatStatus.WAITING,
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' },
                ],
                take: availableSlots,
            });
            for (const chat of waitingChats) {
                try {
                    await this.assignChatToAgent({
                        chatRoomId: chat.id,
                        agentId,
                    });
                }
                catch (error) {
                    console.error(`Failed to assign chat ${chat.id} to agent ${agentId}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Failed to try assign waiting chats:', error);
        }
    }
    async removeFromAgentQueue(chatRoomId) {
        try {
            const queue = await this.redisService.lrange('agent_queue', 0, -1);
            const filteredQueue = queue.filter(id => id !== chatRoomId);
            await this.redisService.del('agent_queue');
            if (filteredQueue.length > 0) {
                await this.redisService.lpush('agent_queue', ...filteredQueue);
            }
        }
        catch (error) {
            console.error('Failed to remove from agent queue:', error);
        }
    }
};
exports.AgentService = AgentService;
exports.AgentService = AgentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object, typeof (_b = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _b : Object, typeof (_c = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _c : Object])
], AgentService);


/***/ }),
/* 34 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CommonModule = void 0;
const common_1 = __webpack_require__(2);
const file_upload_service_1 = __webpack_require__(35);
const notification_service_1 = __webpack_require__(27);
const rating_service_1 = __webpack_require__(39);
const prisma_module_1 = __webpack_require__(10);
const redis_module_1 = __webpack_require__(13);
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, redis_module_1.RedisModule],
        providers: [file_upload_service_1.FileUploadService, notification_service_1.NotificationService, rating_service_1.RatingService],
        exports: [file_upload_service_1.FileUploadService, notification_service_1.NotificationService, rating_service_1.RatingService],
    })
], CommonModule);


/***/ }),
/* 35 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FileUploadService = void 0;
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const multer = __webpack_require__(36);
const path = __webpack_require__(9);
const fs = __webpack_require__(37);
const uuid_1 = __webpack_require__(38);
let FileUploadService = class FileUploadService {
    constructor(configService) {
        this.configService = configService;
        this.uploadPath = this.configService.get('UPLOAD_PATH', './uploads');
        this.maxFileSize = parseInt(this.configService.get('MAX_FILE_SIZE', '10485760'));
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }
    getMulterOptions() {
        return {
            storage: multer.diskStorage({
                destination: (req, file, cb) => {
                    cb(null, this.uploadPath);
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = `${(0, uuid_1.v4)()}${path.extname(file.originalname)}`;
                    cb(null, uniqueSuffix);
                },
            }),
            limits: {
                fileSize: this.maxFileSize,
            },
            fileFilter: (req, file, cb) => {
                const allowedMimeTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'application/pdf',
                    'text/plain',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ];
                if (allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                }
                else {
                    cb(new common_1.BadRequestException('File type not allowed'), false);
                }
            },
        };
    }
    async deleteFile(filePath) {
        const fullPath = path.join(this.uploadPath, filePath);
        try {
            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }
        }
        catch (error) {
            console.error('Error deleting file:', error);
        }
    }
    getFileUrl(filename) {
        return `/uploads/${filename}`;
    }
    validateFileSize(size) {
        return size <= this.maxFileSize;
    }
};
exports.FileUploadService = FileUploadService;
exports.FileUploadService = FileUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], FileUploadService);


/***/ }),
/* 36 */
/***/ ((module) => {

module.exports = require("multer");

/***/ }),
/* 37 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 38 */
/***/ ((module) => {

module.exports = require("uuid");

/***/ }),
/* 39 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RatingService = void 0;
const common_1 = __webpack_require__(2);
const prisma_service_1 = __webpack_require__(11);
const client_1 = __webpack_require__(12);
let RatingService = class RatingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRating(input) {
        try {
            const { chatRoomId, customerId, rating, feedback } = input;
            if (rating < 1 || rating > 5) {
                throw new common_1.BadRequestException('Rating must be between 1 and 5');
            }
            const customer = await this.prisma.user.findUnique({
                where: { id: customerId },
            });
            if (!customer || customer.role !== client_1.UserRole.CUSTOMER) {
                throw new common_1.BadRequestException('Invalid customer');
            }
            const chatRoom = await this.prisma.chatRoom.findUnique({
                where: { id: chatRoomId },
                include: {
                    participants: true,
                },
            });
            if (!chatRoom) {
                throw new common_1.NotFoundException('Chat room not found');
            }
            if (chatRoom.status !== 'CLOSED') {
                throw new common_1.BadRequestException('Can only rate closed chats');
            }
            const customerParticipant = chatRoom.participants.find(p => p.userId === customerId);
            if (!customerParticipant) {
                throw new common_1.ForbiddenException('Customer was not a participant in this chat');
            }
            const existingRating = await this.prisma.chatRating.findUnique({
                where: {
                    chatRoomId_customerId: {
                        chatRoomId,
                        customerId,
                    },
                },
            });
            if (existingRating) {
                throw new common_1.BadRequestException('Rating already exists for this chat');
            }
            const chatRating = await this.prisma.chatRating.create({
                data: {
                    chatRoomId,
                    customerId,
                    rating,
                    feedback,
                },
                include: {
                    chatRoom: {
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return chatRating;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to create rating: ${error.message}`);
        }
    }
    async updateRating(input) {
        try {
            const { ratingId, customerId, rating, feedback } = input;
            if (rating < 1 || rating > 5) {
                throw new common_1.BadRequestException('Rating must be between 1 and 5');
            }
            const existingRating = await this.prisma.chatRating.findUnique({
                where: { id: ratingId },
            });
            if (!existingRating) {
                throw new common_1.NotFoundException('Rating not found');
            }
            if (existingRating.customerId !== customerId) {
                throw new common_1.ForbiddenException('Can only update your own ratings');
            }
            const updatedRating = await this.prisma.chatRating.update({
                where: { id: ratingId },
                data: {
                    rating,
                    feedback,
                },
                include: {
                    chatRoom: {
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return updatedRating;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to update rating: ${error.message}`);
        }
    }
    async getRating(chatRoomId, customerId) {
        try {
            return await this.prisma.chatRating.findUnique({
                where: {
                    chatRoomId_customerId: {
                        chatRoomId,
                        customerId,
                    },
                },
                include: {
                    chatRoom: {
                        include: {
                            assignedTo: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            console.error('Failed to get rating:', error);
            return null;
        }
    }
    async getAgentRatings(agentId, limit = 50) {
        try {
            return await this.prisma.chatRating.findMany({
                where: {
                    chatRoom: {
                        assignedToId: agentId,
                    },
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    chatRoom: {
                        select: {
                            id: true,
                            title: true,
                            createdAt: true,
                            closedAt: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get agent ratings: ${error.message}`);
        }
    }
    async getAgentAverageRating(agentId) {
        try {
            const ratings = await this.prisma.chatRating.findMany({
                where: {
                    chatRoom: {
                        assignedToId: agentId,
                    },
                },
                select: {
                    rating: true,
                },
            });
            if (ratings.length === 0) {
                return { averageRating: 0, totalRatings: 0 };
            }
            const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = totalRating / ratings.length;
            return {
                averageRating: Math.round(averageRating * 100) / 100,
                totalRatings: ratings.length,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get agent average rating: ${error.message}`);
        }
    }
    async deleteRating(ratingId, customerId) {
        try {
            const existingRating = await this.prisma.chatRating.findUnique({
                where: { id: ratingId },
            });
            if (!existingRating) {
                throw new common_1.NotFoundException('Rating not found');
            }
            if (existingRating.customerId !== customerId) {
                throw new common_1.ForbiddenException('Can only delete your own ratings');
            }
            await this.prisma.chatRating.delete({
                where: { id: ratingId },
            });
            return true;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to delete rating: ${error.message}`);
        }
    }
};
exports.RatingService = RatingService;
exports.RatingService = RatingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object])
], RatingService);


/***/ }),
/* 40 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SocketModule = void 0;
const common_1 = __webpack_require__(2);
const socket_gateway_1 = __webpack_require__(41);
const auth_module_1 = __webpack_require__(16);
const chat_module_1 = __webpack_require__(25);
const redis_module_1 = __webpack_require__(13);
const common_module_1 = __webpack_require__(34);
let SocketModule = class SocketModule {
};
exports.SocketModule = SocketModule;
exports.SocketModule = SocketModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, chat_module_1.ChatModule, redis_module_1.RedisModule, common_module_1.CommonModule],
        providers: [socket_gateway_1.SocketGateway],
        exports: [socket_gateway_1.SocketGateway],
    })
], SocketModule);


/***/ }),
/* 41 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SocketGateway = void 0;
const websockets_1 = __webpack_require__(42);
const common_1 = __webpack_require__(2);
const socket_io_1 = __webpack_require__(43);
const jwt_1 = __webpack_require__(17);
const auth_service_1 = __webpack_require__(19);
const chat_service_1 = __webpack_require__(26);
const message_service_1 = __webpack_require__(32);
const agent_service_1 = __webpack_require__(33);
const redis_service_1 = __webpack_require__(14);
const notification_service_1 = __webpack_require__(27);
const chat_resolver_1 = __webpack_require__(28);
const client_1 = __webpack_require__(12);
let SocketGateway = class SocketGateway {
    constructor(jwtService, authService, chatService, messageService, agentService, redisService, notificationService) {
        this.jwtService = jwtService;
        this.authService = authService;
        this.chatService = chatService;
        this.messageService = messageService;
        this.agentService = agentService;
        this.redisService = redisService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger('SocketGateway');
        this.userSockets = new Map();
        this.socketUsers = new Map();
    }
    afterInit(server) {
        this.logger.log('Socket.IO Gateway initialized');
    }
    async handleConnection(client, ...args) {
        try {
            const token = this.extractTokenFromSocket(client);
            if (!token) {
                throw new common_1.UnauthorizedException('No token provided');
            }
            const payload = await this.authService.validateToken(token);
            const user = await this.authService.validateUser(payload);
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid user');
            }
            client.user = user;
            this.userSockets.set(user.id, client.id);
            this.socketUsers.set(client.id, user);
            await this.authService.setUserOnline(user.id);
            client.join(`user:${user.id}`);
            if (user.role === 'AGENT') {
                client.join('agents');
                try {
                    const agentStatus = await this.agentService.getAgentStatus(user.id);
                    if (!agentStatus || agentStatus.status === 'OFFLINE') {
                        await this.agentService.updateAgentStatus({
                            agentId: user.id,
                            status: 'AVAILABLE',
                        });
                    }
                }
                catch (error) {
                    this.logger.error('Failed to update agent status on connection:', error);
                }
            }
            await this.joinUserChatRooms(client, user.id);
            this.logger.log(`Client connected: ${client.id} (User: ${user.name})`);
            client.emit('connected', {
                message: 'Successfully connected',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        }
        catch (error) {
            this.logger.error('Connection failed:', error.message);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        try {
            const user = this.socketUsers.get(client.id);
            if (user) {
                await this.authService.setUserOffline(user.id);
                if (user.role === 'AGENT') {
                    try {
                        await this.agentService.updateAgentStatus({
                            agentId: user.id,
                            status: 'OFFLINE',
                        });
                    }
                    catch (error) {
                        this.logger.error('Failed to update agent status on disconnect:', error);
                    }
                }
                this.userSockets.delete(user.id);
                this.socketUsers.delete(client.id);
                this.logger.log(`Client disconnected: ${client.id} (User: ${user.name})`);
            }
        }
        catch (error) {
            this.logger.error('Disconnect error:', error);
        }
    }
    async handleJoinRoom(data, client) {
        try {
            if (!client.user) {
                throw new common_1.UnauthorizedException('Not authenticated');
            }
            const { chatRoomId } = data;
            try {
                await this.chatService.getChatRoom(chatRoomId, client.user.id);
            }
            catch (error) {
                client.emit('error', { message: 'Access denied to chat room' });
                return;
            }
            client.join(`chat:${chatRoomId}`);
            await this.messageService.markMessagesAsRead(chatRoomId, client.user.id);
            client.emit('joined_room', { chatRoomId });
            client.to(`chat:${chatRoomId}`).emit('user_joined', {
                chatRoomId,
                user: {
                    id: client.user.id,
                    name: client.user.name,
                    role: client.user.role,
                },
                joinedAt: new Date(),
            });
            this.logger.log(`User ${client.user.name} joined room ${chatRoomId}`);
        }
        catch (error) {
            this.logger.error('Join room error:', error);
            client.emit('error', { message: 'Failed to join room' });
        }
    }
    async handleLeaveRoom(data, client) {
        try {
            if (!client.user) {
                throw new common_1.UnauthorizedException('Not authenticated');
            }
            const { chatRoomId } = data;
            client.leave(`chat:${chatRoomId}`);
            client.emit('left_room', { chatRoomId });
            client.to(`chat:${chatRoomId}`).emit('user_left', {
                chatRoomId,
                user: {
                    id: client.user.id,
                    name: client.user.name,
                    role: client.user.role,
                },
                leftAt: new Date(),
            });
            this.logger.log(`User ${client.user.name} left room ${chatRoomId}`);
        }
        catch (error) {
            this.logger.error('Leave room error:', error);
            client.emit('error', { message: 'Failed to leave room' });
        }
    }
    async handleSendMessage(data, client) {
        try {
            if (!client.user) {
                throw new common_1.UnauthorizedException('Not authenticated');
            }
            const { chatRoomId, content, type, fileUrl, fileName, fileSize } = data;
            const message = await this.messageService.sendMessage({
                chatRoomId,
                senderId: client.user.id,
                content,
                type: type || client_1.MessageType.TEXT,
                fileUrl,
                fileName,
                fileSize,
            });
            this.server.to(`chat:${chatRoomId}`).emit('message_received', message);
            chat_resolver_1.ChatResolver.publishTypingEvent({
                chatRoomId,
                userId: client.user.id,
                isTyping: false,
            });
            this.logger.log(`Message sent in room ${chatRoomId} by ${client.user.name}`);
        }
        catch (error) {
            this.logger.error('Send message error:', error);
            client.emit('error', { message: 'Failed to send message' });
        }
    }
    async handleTyping(data, client) {
        try {
            if (!client.user) {
                return;
            }
            const { chatRoomId, isTyping } = data;
            client.to(`chat:${chatRoomId}`).emit('user_typing', {
                chatRoomId,
                user: {
                    id: client.user.id,
                    name: client.user.name,
                },
                isTyping,
            });
            chat_resolver_1.ChatResolver.publishTypingEvent({
                chatRoomId,
                userId: client.user.id,
                userName: client.user.name,
                isTyping,
            });
        }
        catch (error) {
            this.logger.error('Typing error:', error);
        }
    }
    async handleAgentStatus(data, client) {
        try {
            if (!client.user || client.user.role !== 'AGENT') {
                throw new common_1.UnauthorizedException('Only agents can update status');
            }
            const { status, statusMessage } = data;
            await this.agentService.updateAgentStatus({
                agentId: client.user.id,
                status: status,
                statusMessage,
            });
            this.server.to('agents').emit('agent_status_changed', {
                agentId: client.user.id,
                agentName: client.user.name,
                status,
                statusMessage,
                updatedAt: new Date(),
            });
            client.emit('status_updated', { status, statusMessage });
            this.logger.log(`Agent ${client.user.name} status updated to ${status}`);
        }
        catch (error) {
            this.logger.error('Agent status error:', error);
            client.emit('error', { message: 'Failed to update status' });
        }
    }
    async handleAssignChat(data, client) {
        try {
            if (!client.user || (client.user.role !== 'AGENT' && client.user.role !== 'ADMIN')) {
                throw new common_1.UnauthorizedException('Insufficient permissions');
            }
            const { chatRoomId, agentId } = data;
            const targetAgentId = agentId || client.user.id;
            const chatRoom = await this.agentService.assignChatToAgent({
                chatRoomId,
                agentId: targetAgentId,
            });
            const agentSocketId = this.userSockets.get(targetAgentId);
            if (agentSocketId) {
                this.server.to(agentSocketId).emit('chat_assigned', chatRoom);
            }
            const customer = chatRoom.participants?.find(p => p.user.role === 'CUSTOMER');
            if (customer) {
                const customerSocketId = this.userSockets.get(customer.userId);
                if (customerSocketId) {
                    this.server.to(customerSocketId).emit('agent_assigned', {
                        chatRoom,
                        agent: chatRoom.assignedTo,
                    });
                }
            }
            client.emit('chat_assigned_success', chatRoom);
            this.logger.log(`Chat ${chatRoomId} assigned to agent ${targetAgentId}`);
        }
        catch (error) {
            this.logger.error('Assign chat error:', error);
            client.emit('error', { message: 'Failed to assign chat' });
        }
    }
    async notifyUser(userId, event, data) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.server.to(socketId).emit(event, data);
        }
    }
    async notifyAgents(event, data) {
        this.server.to('agents').emit(event, data);
    }
    async notifyRoom(chatRoomId, event, data) {
        this.server.to(`chat:${chatRoomId}`).emit(event, data);
    }
    extractTokenFromSocket(client) {
        const token = client.handshake.auth?.token ||
            client.handshake.headers?.authorization?.replace('Bearer ', '');
        return token || null;
    }
    async joinUserChatRooms(client, userId) {
        try {
            const chatRooms = await this.chatService.getUserChatRooms(userId);
            for (const chatRoom of chatRooms) {
                if (chatRoom.status !== 'CLOSED') {
                    client.join(`chat:${chatRoom.id}`);
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to join user chat rooms:', error);
        }
    }
};
exports.SocketGateway = SocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", typeof (_h = typeof socket_io_1.Server !== "undefined" && socket_io_1.Server) === "function" ? _h : Object)
], SocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_room'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent_status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleAgentStatus", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('assign_chat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocketGateway.prototype, "handleAssignChat", null);
exports.SocketGateway = SocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, typeof (_b = typeof auth_service_1.AuthService !== "undefined" && auth_service_1.AuthService) === "function" ? _b : Object, typeof (_c = typeof chat_service_1.ChatService !== "undefined" && chat_service_1.ChatService) === "function" ? _c : Object, typeof (_d = typeof message_service_1.MessageService !== "undefined" && message_service_1.MessageService) === "function" ? _d : Object, typeof (_e = typeof agent_service_1.AgentService !== "undefined" && agent_service_1.AgentService) === "function" ? _e : Object, typeof (_f = typeof redis_service_1.RedisService !== "undefined" && redis_service_1.RedisService) === "function" ? _f : Object, typeof (_g = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _g : Object])
], SocketGateway);


/***/ }),
/* 42 */
/***/ ((module) => {

module.exports = require("@nestjs/websockets");

/***/ }),
/* 43 */
/***/ ((module) => {

module.exports = require("socket.io");

/***/ }),
/* 44 */
/***/ ((module) => {

module.exports = require("@nestjs/platform-socket.io");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const core_1 = __webpack_require__(1);
const common_1 = __webpack_require__(2);
const config_1 = __webpack_require__(3);
const app_module_1 = __webpack_require__(4);
const prisma_service_1 = __webpack_require__(11);
const platform_socket_io_1 = __webpack_require__(44);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 3000);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', 'http://localhost:3000').split(','),
        credentials: true,
    });
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const prismaService = app.get(prisma_service_1.PrismaService);
    await prismaService.enableShutdownHooks(app);
    console.log(`🚀 Chat Microservice starting on port ${port}`);
    console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    await app.listen(port);
}
bootstrap().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
});

})();

/******/ })()
;