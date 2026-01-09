DO $$
DECLARE
  admin_id INTEGER := 2;
  menu_id INTEGER;
  slug_var TEXT;

  slugs TEXT[] := ARRAY[
    'acesso'
  ];
BEGIN
  -------------------------------------------------------------------
  -- 1. Criar nível Admin com id = 2 caso não exista
  -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM "Nivel_Acesso" WHERE "idNivelAcesso" = admin_id) THEN
    INSERT INTO "Nivel_Acesso" ("idNivelAcesso", "nome")
    VALUES (admin_id, 'Admin')
    ON CONFLICT ("idNivelAcesso") DO NOTHING;
  END IF;

  -------------------------------------------------------------------
  -- 2. Atribuir slugs ao nível Admin
  -------------------------------------------------------------------
  FOREACH slug_var IN ARRAY slugs LOOP
    SELECT "idMenuAcesso"
      INTO menu_id
      FROM "Menu_Acesso"
      WHERE "slug" = slug_var
      LIMIT 1;

    IF menu_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM "_Menu_AcessoToNivel_Acesso"
        WHERE "A" = menu_id AND "B" = admin_id
      ) THEN
        INSERT INTO "_Menu_AcessoToNivel_Acesso" ("A","B")
        VALUES (menu_id, admin_id);
      END IF;
    END IF;
  END LOOP;

  -------------------------------------------------------------------
  -- 3. Criar ou atualizar seu usuário como ADMIN (idNivelAcesso = 2)
  -------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'renan.nardi.dev@gmail.com') THEN
    INSERT INTO "User" (
      "idUser", "name", "email", "password",
      "active", "nivelAcessoId", "type", "cpf"
    ) VALUES (
      'renan_admin_2',
      'Renan Nardi',
      'renan.nardi.dev@gmail.com',
      '$2b$10$Ja7sEVfh1ifyYYv8hJOD/eNhw2l60oH/YYY7uYvKF3AT9chdkxFkG',
      true,
      admin_id,
      'ADMIN',
      '118.402.239-95'
    );
  ELSE
    UPDATE "User"
    SET
      "name" = 'Renan Nardi',
      "password" = '$2b$10$Ja7sEVfh1ifyYYv8hJOD/eNhw2l60oH/YYY7uYvKF3AT9chdkxFkG',
      "active" = true,
      "nivelAcessoId" = admin_id,
      "type" = 'ADMIN'
    WHERE "email" = 'renan.nardi.dev@gmail.com';
  END IF;

END$$ LANGUAGE plpgsql;
