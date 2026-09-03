-- ============================================================
-- Datos de prueba para CU03 (Catalogo) y CU04 (Ficha de Obra)
-- Ejecutar en el SQL Editor de Supabase DESPUES de schema_LEER_supabase.sql
-- ============================================================
--
-- Corre como rol `postgres` desde el SQL Editor, asi que saltea RLS: por eso
-- puede insertar en `obra`, que no tiene policy de INSERT.
--
-- Es idempotente: se apoya en el UNIQUE de libro.google_books_id, se puede
-- correr varias veces sin duplicar nada.
--
-- Los google_books_id son reales, traidos de la API. Dos libros quedan a
-- proposito SIN portada ni sinopsis, para poder ver la ficha completandolos
-- en vivo desde Google Books.
-- ============================================================

DO $seed$
DECLARE
    v_id_obra INTEGER;
    v_lector  UUID;
    r         RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('2yrVlXySgOAC', 'Rayuela', 'Julio Cortázar, Julio Ortega, Saúl Yurkiévich', 'Novela', 'Oliveira, la Maga y el Club de la Serpiente, entre Paris y Buenos Aires. La novela que propone dos itinerarios de lectura y deja que sea el lector quien elija el orden de los capitulos.', NULL, 'https://books.google.com/books/content?id=2yrVlXySgOAC&printsec=frontcover&img=1&zoom=1&source=gbs_api'),
            ('kmAQCwAAQBAJ', 'Cien años de soledad', 'Gabriel García Márquez', 'Realismo magico', 'Señalada como «catedral gótica del lenguaje», este clásico del siglo XX es el enorme y espléndido tapiz de la saga de la familia Buendía, en la mítica aldea de Macondo. UNO DE LOS 5 LIBROS MÁS IMPORTANTES DE LOS ÚLTIMOS 125 AÑOS SEGÚN THE NEW YORK TIMES Un referente imprescindible de la vida y la narrativa latinoamericana. «Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo. Macondo era entonces una aldea de veinte casas de barro y cañabrava construidas a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos. El mundo era tan reciente, que muchas cosas carecían de nombre, y para mencionarlas había que señalarlas con el dedo». Con estas palabras empieza la novela ya legendaria en los anales de la literatura universal, una de las aventuras literarias más fascinantes de nuestro siglo. Millones de ejemplares de Cien años de soledad leídos en todas las lenguas y el Premio Nobel de Literatura coronando una obra que se había abierto paso «boca a boca» -como gusta decir al escritor- son la más palpable demostración de que la aventura fabulosa de la familia Buendía-Iguarán, con sus milagros, fantasías, obsesiones, tragedias, incestos, adulterios, rebeldías, descubrimientos y condenas, representaba al mismo tiempo el mito y la historia, la tragedia y el amor del mundo entero. Pablo Neruda dijo... «El Quijote de nuestro tiempo.»', '9788439731764', 'https://books.google.com/books/content?id=kmAQCwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'),
            ('y_tIAAAAYAAJ', 'Ficciones', 'Jorge Luis Borges', 'Cuento', 'Se reúnen en "Ficciones" dos libros de Jorge Luis Borges fechados en 1941 y 1944. «El jardín de senderos que se bifurcan» incluye ocho relatos, entre los que cabe destacar dos breves narraciones de excepcional calidad: «Pierre Menard, autor del Quijote» y «La Biblioteca de Babel». «Artificios» lo forman nueve cuentos, entre ellos «La muerte y la brújula» (historia de una tortuosa venganza), «Funes el memorioso» (una larga metáfora del insomnio) y «El Sur» («acaso mi mejor cuento», en palabras del autor).', NULL, 'https://books.google.com/books/content?id=y_tIAAAAYAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'),
            ('FnT5EAAAQBAJ', 'Pedro Páramo', 'Juan Rulfo', 'Realismo magico', '"Desconcertante, lista a inquietar a la crítica, está ya en los escaparates la primera novela de Juan Rulfo, Pedro Páramo, que transcurre en una serie de transposiciones oníricas, ahondando más allá de la muerte de sus personajes, que uno no sabe en qué momento son sueño, vida, fábula, verdad, pero a los que se les oye la voz al través de la perspicacia despiadada y certera de tan sin duda extraordinario escritor". Con estas palabras iniciaba Edmundo Valdés la primera reseña de Pedro Páramo, aparecida el 30 de marzo de 1955 y conservada por Juan Rulfo entre sus papeles. Desde entonces el reconocimiento a esta obra maestra ha sido constante, hasta el punto que la encuesta del Instituto Nobel de Suecia, de 2002, dirigida a un centenar de escritores y estudiosos de todo el mundo, situó a Pedro Páramo entre las cien obras que constituyen el núcleo del patrimonio universal de la literatura.', '9788419233790', 'https://books.google.com/books/content?id=FnT5EAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'),
            ('WY1IAgAAQBAJ', 'La casa de los espíritus', 'Isabel Allende', 'Realismo magico', 'La primera novela de Isabel Allende, La casa de los espíritus, narra la saga de una poderosa familia de terratenientes latinoamericanos. El despótico patriarca Esteban Trueba ha construido con mano de hierro un imperio privado que empieza a tambalearse con el paso del tiempo y un entorno social explosivo. Finalmente, la decadencia personal del patriarca arrastrará a los Trueba a una dolorosa desintegración. Atrapados en unas dramáticas relaciones familiares, los personajes de esta poderosa novela encarnan las tensiones sociales y espirituales de una época que abarca gran parte del siglo XX. Con impecable pulso narrativo y gran lucidez histórica, Isabel Allende ha creado un fresco en el que conviven lo cotidiano con lo maravilloso, el amor con la revolución y los ideales personales con la dura realidad política. La crítica ha dicho: «Un logro único, a la vez testimonio personal y posible alegoría del pasado, el presente y el futuro de América Latina.» The New York Times Book Review «Una crónica fuerte y absorbente de una familia chilena, con detalles opulentos y con un trasfondo místico... Un refinada combinación de escenarios.» Kirkus Review «Hay muy pocos viajes más emocionantes que los realizados en la imaginación de una novelista genial. Esa experiencia está disponible en La Casa de los Espíritus de Isabel Allende...» Cosmopolitan «La escritura de Allende es tan creativa, divertida y convincente que en el proceso de crear una estimulante novela política también ha creado una viva y una cautivante obra de arte. Sus personajes son fascinantemente detallados y humanos.» People «Un cuento seductor, a veces mágico... En su tumultuosa historia de la rebelión y el amor entre tres generaciones, es una alegoría en la que cualquier familia debería ser capaz de reconocer un poco de sí misma.» The Wall Street Journal «Absolutamente sorprendente. En La Casa de los Espíritus, Isabel Allende nos ha demostrado la relación entre el pasado y el presente, la familia y la nación, la ciudad y el país, los valores espirituales y los políticos.» San Francisco Chronicle', '9788401342585', 'https://books.google.com/books/content?id=WY1IAgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'),
            ('P55UAAAAMAAJ', 'El túnel', 'Ernesto R. Sábato', 'Novela psicologica', NULL, NULL, NULL),
            ('pecOAQAAIAAJ', 'Boquitas pintadas', 'Manuel Puig', 'Novela', NULL, NULL, NULL),
            ('EzdNEQAAQBAJ', 'Los detectives salvajes (edición ilustrada)', 'Roberto Bolaño', 'Novela', 'Una de las mejores novelas del siglo XXI, según The New York Times y El País en edición especial ilustrada por Luis Scafati «No es exagerado decir que Bolaño es un genio. Los detectives salvajes debería otorgarle la inmortalidad». Washington Post UNO DE LOS MEJORES LIBROS DE LOS ÚLTIMOS 25 AÑOS SEGÚN AMAZON «He sido cordialmente invitado a formar parte del realismo visceral. Por supuesto, he aceptado. No hubo ceremonia de iniciación. Mejor así». La búsqueda en 1975 de la misteriosa escritora mexicana Cesárea Tinajero, desaparecida y olvidada en los años posteriores a la revolución, sirve de inicio a un viaje sin descanso que llevan a cabo dos jóvenes poetas latinoamericanos, Arturo Belano y Ulises Lima. Durante varias décadas y a través distintos países, su aventura transcurre marcada por el amor, la muerte, el deseo de libertad, el humor y la literatura. Símbolo de la rebeldía y la necesidad de ruptura con la realidad establecida, sus vidas representan los anhelos de toda una generación. La obra de Bolaño conversa con el arte del ilustrador argentino Luis Scafati en esta edición especial ilustrada de una novela que ganó los premios Herralde y Rómulo Gallegos y está considerada una de las mejores novelas del siglo XXI por medios como The New York Times o El País. La crítica ha dicho: «Salvajemente cómica y, al mismo tiempo, tierna. Una elegía para una generación». The Independent «Bolaño te hace sentir cambiado por haberlo leído; ajusta tu ángulo de visión del mundo». The Guardian «La más importante novela latinoamericana "total" que se ha escrito después del Boom, y posiblemente la última, su canto de cisne». El País «Un carrusel de lenguaje y destreza narrativa que sin duda es lo mejor que se ha escrito en castellano en las últimas décadas». Iván Thays, Babelia «Una novela maravillosa que hay que leer sí o sí para emocionarse de nuevo con la literatura, la juventud y el descubrimiento. El libro que hay que recomendar cuando alguien nos dice que no le gusta leer, o cuando alguien se pierde por los caminos de la literatura que no aporta nada. Con este libro se regresa al sendero correcto. Alfaguara publica una lujosa edición que igual no es la mejor para llevarla en el bolsillo y crearle el desgaste de la vida, pero sí para disfrutarlo de otra manera, o para regalarlo con mucho cariño a alguien. Viva el realismo visceral». Elena Cabrera, elDiario «Bolaño ha probado que la literatura lo puede todo». Jonathan Lethem «Una especie de ebriedad narrativa que nos deja abrumados, sonriendo de obnubilación o de admiración». Fabrice Gabriel, Les Inrockuptibles «Una obra maestra». San Francisco Cronicle «Uno de los autores más respetados e influyentes de su generación [...]. Al mismo tiempo divertido y, en cierto sentido, intensamente aterrador». John Banville, The Nation «El mito de Bolaño ha servido para potencia el reconocimiento de una obra donde había originalidad, donde había calidad». Mario Vargas Llosa', '9788420476452', 'https://books.google.com/books/content?id=EzdNEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api')
        ) AS t(google_books_id, titulo, autor_texto, genero, sinopsis, isbn, portada_url)
    LOOP
        CONTINUE WHEN EXISTS (SELECT 1 FROM libro l WHERE l.google_books_id = r.google_books_id);

        INSERT INTO obra (titulo, genero, sinopsis)
        VALUES (r.titulo, r.genero, r.sinopsis)
        RETURNING id_obra INTO v_id_obra;

        INSERT INTO libro (id_obra, google_books_id, autor_texto, isbn, portada_url)
        VALUES (v_id_obra, r.google_books_id, r.autor_texto, r.isbn, r.portada_url);
    END LOOP;

    -- Escrito de la comunidad y resenas: solo si ya existe algun lector_escritor.
    -- Ambas tablas tienen FK a lector_escritor(id_usuario), que cuelga de
    -- auth.users. Registrate una vez en la app y volve a correr este script.
    SELECT id_usuario INTO v_lector FROM lector_escritor LIMIT 1;

    IF v_lector IS NULL THEN
        RAISE NOTICE 'Sin lector_escritor: se cargaron solo los libros. Registra un usuario y volve a correr este script para sumar un escrito y las resenas.';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM obra WHERE titulo = 'Cuaderno de invierno') THEN
        INSERT INTO obra (titulo, genero, sinopsis)
        VALUES ('Cuaderno de invierno', 'Cronica',
                'Una cronica breve sobre volver al pueblo donde uno aprendio a leer.')
        RETURNING id_obra INTO v_id_obra;

        INSERT INTO escrito (id_obra, id_autor, contenido_url)
        VALUES (v_id_obra, v_lector, 'https://example.org/cuaderno-de-invierno');
    END IF;

    -- Una resena por obra. El UNIQUE (id_usuario, id_obra) impide repetir.
    INSERT INTO resena (id_usuario, id_obra, calificacion, comentario)
    SELECT v_lector, o.id_obra,
           4 + (o.id_obra % 2),
           'Resena de prueba cargada por el seed para validar CU04.'
    FROM obra o
    WHERE NOT EXISTS (
        SELECT 1 FROM resena x WHERE x.id_obra = o.id_obra AND x.id_usuario = v_lector
    );

    -- obra.promedio_calificacion esta desnormalizado y ningun trigger del
    -- schema lo mantiene: el seed lo recalcula a mano.
    UPDATE obra o
    SET promedio_calificacion = sub.prom
    FROM (SELECT id_obra, ROUND(AVG(calificacion), 2) AS prom
          FROM resena WHERE estado = 'activa' GROUP BY id_obra) sub
    WHERE o.id_obra = sub.id_obra;
END
$seed$;

SELECT (SELECT COUNT(*) FROM obra)    AS obras,
       (SELECT COUNT(*) FROM libro)   AS libros,
       (SELECT COUNT(*) FROM escrito) AS escritos,
       (SELECT COUNT(*) FROM resena)  AS resenas;
