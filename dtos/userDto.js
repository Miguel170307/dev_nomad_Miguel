import { USER_ROLES, ROLE_PERMISSIONS } from '../controllers/userController.js';

const ROLE_ALIASES = Object.freeze({
    nomad: USER_ROLES.NOMAD,
    nomade: USER_ROLES.NOMAD,
    dev_nomad: USER_ROLES.NOMAD,
    dev: USER_ROLES.NOMAD,
    host: USER_ROLES.HOST,
    anfitriao: USER_ROLES.HOST,
    workspace_creator: USER_ROLES.HOST,
    ponto_trabalho: USER_ROLES.HOST,
    place: USER_ROLES.PLACE,
    lugar: USER_ROLES.PLACE,
    estabelecimento: USER_ROLES.PLACE,
    local: USER_ROLES.PLACE,
    admin: USER_ROLES.ADMIN,
    administrador: USER_ROLES.ADMIN
});

/**
 * @param {string} [role]
 * @returns {string}
 */
export function normalizeUserRole(role) {
    if (!role) {
        return USER_ROLES.NOMAD;
    }

    const cleanRole = String(role)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const mappedRole = ROLE_ALIASES[cleanRole];
    if (!mappedRole) {
        const validRoles = Object.values(USER_ROLES).join(', ');
        throw new Error(`Perfil de usuário inválido ("${role}"). Perfis permitidos: ${validRoles}.`);
    }

    return mappedRole;
}

/**
 * @param {Object} reqOrData
 * @returns {Object}
 */
export function extractPayload(reqOrData) {
    if (!reqOrData || typeof reqOrData !== 'object') {
        throw new Error('Dados da requisição não foram informados.');
    }

    return reqOrData.body && typeof reqOrData.body === 'object'
        ? reqOrData.body
        : reqOrData;
}

export class CreateUserRequestDTO {
    /**
     * @param {Object} data
     * @param {string|null} [forcedRole=null]
     */
    constructor(data = {}, forcedRole = null) {
        const payload = extractPayload(data);
        const rawEmail = payload.email !== undefined && payload.email !== null ? String(payload.email).trim().toLowerCase() : '';
        const rawPassword = payload.password !== undefined && payload.password !== null ? String(payload.password) : '';
        const rawDisplayName = payload.displayName !== undefined && payload.displayName !== null ? String(payload.displayName).trim() : '';
        const rawPhotoURL = payload.photoURL !== undefined && payload.photoURL !== null ? String(payload.photoURL).trim() : '';
        const rawPhoneNumber = payload.phoneNumber !== undefined && payload.phoneNumber !== null ? String(payload.phoneNumber).trim() : '';

        this.email = rawEmail;
        this.password = rawPassword;
        this.displayName = rawDisplayName;
        this.photoURL = rawPhotoURL;
        this.phoneNumber = rawPhoneNumber;
        this.role = normalizeUserRole(forcedRole || payload.role);
    }

    /**
     * @returns {CreateUserRequestDTO}
     */
    validate() {
        if (!this.email) {
            throw new Error('O e-mail é obrigatório.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email)) {
            throw new Error('Formato de e-mail inválido.');
        }

        if (!this.password) {
            throw new Error('A senha é obrigatória.');
        }

        if (this.password.length < 6) {
            throw new Error('A senha deve possuir no mínimo 6 caracteres.');
        }

        if ((this.role === USER_ROLES.HOST || this.role === USER_ROLES.PLACE) && !this.displayName) {
            const actorLabel = this.role === USER_ROLES.HOST
                ? 'o criador de pontos de trabalho (host)'
                : 'o lugar/estabelecimento (place)';
            throw new Error(`O nome de exibição (displayName) é obrigatório para ${actorLabel}.`);
        }

        if (this.phoneNumber) {
            const cleanPhone = this.phoneNumber.replace(/[^\d+]/g, '');
            if (cleanPhone.length < 8) {
                throw new Error('O número de telefone informado é inválido.');
            }
        }

        return this;
    }

    /**
     * @returns {Object}
     */
    toPlainObject() {
        return {
            email: this.email,
            password: this.password,
            displayName: this.displayName,
            photoURL: this.photoURL,
            phoneNumber: this.phoneNumber,
            role: this.role,
            disable: false
        };
    }
}

export class LoginRequestDTO {
    /**
     * @param {Object} data
     */
    constructor(data = {}) {
        const payload = extractPayload(data);
        this.email = payload.email !== undefined && payload.email !== null ? String(payload.email).trim().toLowerCase() : '';
        this.password = payload.password !== undefined && payload.password !== null ? String(payload.password) : '';
    }

    /**
     * @returns {LoginRequestDTO}
     */
    validate() {
        if (!this.email) {
            throw new Error('O e-mail é obrigatório.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.email)) {
            throw new Error('Formato de e-mail inválido.');
        }

        if (!this.password) {
            throw new Error('A senha é obrigatória.');
        }

        if (this.password.length < 6) {
            throw new Error('A senha deve possuir no mínimo 6 caracteres.');
        }

        return this;
    }

    /**
     * @returns {Object}
     */
    toPlainObject() {
        return {
            email: this.email,
            password: this.password
        };
    }
}

export class UpdateUserRequestDTO {
    /**
     * @param {Object} data
     */
    constructor(data = {}) {
        const payload = extractPayload(data);
        this.displayName = payload.displayName !== undefined ? String(payload.displayName).trim() : undefined;
        this.photoURL = payload.photoURL !== undefined ? String(payload.photoURL).trim() : undefined;
        this.phoneNumber = payload.phoneNumber !== undefined ? String(payload.phoneNumber).trim() : undefined;
        this.role = payload.role !== undefined ? normalizeUserRole(payload.role) : undefined;
    }

    /**
     * @returns {Object}
     */
    toPlainObject() {
        const update = {};
        if (this.displayName !== undefined) update.displayName = this.displayName;
        if (this.photoURL !== undefined) update.photoURL = this.photoURL;
        if (this.phoneNumber !== undefined) update.phoneNumber = this.phoneNumber;
        if (this.role !== undefined) update.role = this.role;
        return update;
    }
}

export class UserResponseDTO {
    /**
     * @param {Object} user
     */
    constructor(user = {}) {
        const role = normalizeUserRole(user.role);
        this.uid = user.uid || null;
        this.email = user.email || '';
        this.displayName = user.displayName || '';
        this.photoURL = user.photoURL || '';
        this.phoneNumber = user.phoneNumber || '';
        this.emailVerified = Boolean(user.emailVerified ?? user.verifiedEmail ?? false);
        this.role = role;
        this.disable = Boolean(user.disable ?? user.disabled ?? false);
        this.permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[USER_ROLES.NOMAD];
        this.createdAt = user.createdAt || null;
        this.updatedAt = user.updatedAt || null;
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        return {
            uid: this.uid,
            email: this.email,
            displayName: this.displayName,
            photoURL: this.photoURL,
            phoneNumber: this.phoneNumber,
            emailVerified: this.emailVerified,
            role: this.role,
            disable: this.disable,
            permissions: this.permissions,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
