BEGIN;

-- Ensure Nivel_Acesso with id 1 and nome 'Não Autorizado' exists
INSERT INTO "Nivel_Acesso" ("idNivelAcesso", "nome")
SELECT 1, 'Não Autorizado'
WHERE NOT EXISTS (SELECT 1 FROM "Nivel_Acesso" WHERE "idNivelAcesso" = 1);

-- Try to advance sequence for idNivelAcesso if sequence exists
DO $$
BEGIN
  BEGIN
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX("idNivelAcesso") FROM "Nivel_Acesso"), 1) + 1, false)', '"Nivel_Acesso"', 'idNivelAcesso');
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END$$;

-- Seed Menu_Acesso entries with all permissions = TRUE

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Acessos / Permissões', 'acesso', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'acesso');

COMMIT;
