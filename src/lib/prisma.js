import { PrismaClient } from "@prisma/client";

/**
 * Prisma-client met `admin-rol-guard` extensie:
 * - `user.create` / `createMany` weigert rol="admin" volledig — een admin
 *   wordt enkel gemaakt via een DB-script, nooit via een API-route.
 * - `user.update` / `upsert` weigert het wegnemen van de admin-rol of
 *   het uitvinkken van isAdmin op een bestaand admin-account.
 * - `user.updateMany` weigert mass-updates die admin-accounts zouden
 *   raken (defensief — voorkomt SQL-bypass via een onschuldig-lijkende
 *   updateMany).
 *
 * De toegestane roltypes zijn `consument`, `vakman` en `admin`. Andere
 * waarden worden geweigerd zodra een mutatie ze probeert te zetten.
 */

const TOEGESTANE_ROLLEN = ["consument", "vakman", "admin"];

function unwrap(v) {
  if (v === undefined || v === null) return v;
  if (typeof v === "object" && "set" in v) return v.set;
  return v;
}

function checkRolWaarde(rol) {
  if (rol === undefined) return;
  if (!TOEGESTANE_ROLLEN.includes(rol)) {
    throw new Error(
      `prisma.user mutatie geweigerd: rol="${rol}" is geen geldige waarde (toegestaan: ${TOEGESTANE_ROLLEN.join(", ")}).`
    );
  }
}

function borgRolCreate(args) {
  const data = args.data || {};
  checkRolWaarde(data.rol);
  if (data.rol === "admin") {
    throw new Error(
      "prisma.user.create geweigerd: rol='admin' kan niet via een API-route worden aangemaakt. Gebruik een DB-script."
    );
  }
}

async function borgRolUpdate(base, args) {
  const data = args.data || {};
  const nieuweRol = unwrap(data.rol);
  const nieuweIsAdmin = unwrap(data.isAdmin);

  checkRolWaarde(nieuweRol);

  if (args.where) {
    const bestaand = await base.user.findUnique({
      where: args.where,
      select: { rol: true, isAdmin: true },
    });
    if (bestaand && bestaand.rol === "admin") {
      if (nieuweRol !== undefined && nieuweRol !== "admin") {
        throw new Error(
          "prisma.user.update geweigerd: een admin-account kan niet via een mutatie van rol veranderen."
        );
      }
      if (nieuweIsAdmin === false) {
        throw new Error(
          "prisma.user.update geweigerd: een admin-account kan niet zijn isAdmin-vlag verliezen via een mutatie."
        );
      }
    }
  }

  if (nieuweRol === "admin" && nieuweIsAdmin === false) {
    throw new Error(
      "prisma.user mutatie geweigerd: rol='admin' is alleen geldig in combinatie met isAdmin=true."
    );
  }
}

async function borgRolUpdateMany(base, args) {
  const data = args.data || {};
  const nieuweRol = unwrap(data.rol);
  const nieuweIsAdmin = unwrap(data.isAdmin);
  checkRolWaarde(nieuweRol);

  if (
    (nieuweRol !== undefined && nieuweRol !== "admin") ||
    nieuweIsAdmin === false
  ) {
    const treffer = await base.user.count({
      where: { ...(args.where || {}), rol: "admin" },
    });
    if (treffer > 0) {
      throw new Error(
        `prisma.user.updateMany geweigerd: zou ${treffer} admin-account(s) raken.`
      );
    }
  }
}

function maakClient() {
  const base = new PrismaClient();
  const extended = base.$extends({
    name: "admin-rol-guard",
    query: {
      user: {
        async create({ args, query }) {
          borgRolCreate(args);
          return query(args);
        },
        async createMany({ args, query }) {
          const lijst = Array.isArray(args.data) ? args.data : [args.data];
          for (const d of lijst) borgRolCreate({ data: d });
          return query(args);
        },
        async update({ args, query }) {
          await borgRolUpdate(base, args);
          return query(args);
        },
        async upsert({ args, query }) {
          // Bij upsert valideren we zowel het update-pad als de create-data
          await borgRolUpdate(base, { where: args.where, data: args.update });
          borgRolCreate({ data: args.create });
          return query(args);
        },
        async updateMany({ args, query }) {
          await borgRolUpdateMany(base, args);
          return query(args);
        },
      },
    },
  });
  return extended;
}

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || maakClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
