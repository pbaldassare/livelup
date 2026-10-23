-- Sostituisce il catalogo piattaforma (import Cibarius)
DELETE FROM public.nutrition_template_recipes WHERE is_platform = true;

INSERT INTO public.nutrition_template_recipes (
  slug, category, name, description, per_serving_kcal, per_serving_protein_g,
  per_serving_carbs_g, per_serving_fat_g, ingredients, instructions, sort_order,
  diet_plan, prep_time_min
)
VALUES
  ('cib-digiuno-cena-bistecca-con-contorno-misto-1', 'cena', 'Bistecca con contorno misto', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 506, 44, 30, 22, '- Bistecca di manzo 200g
- Patate al forno 150g
- Insalata mista 60g
- Olio EVO 12g', 'Grigliare la bistecca, servire con patate al forno e insalata.', 300, 'digiuno', 25),
  ('cib-digiuno-cena-branzino-con-carciofi-2', 'cena', 'Branzino con carciofi', 'Piano: Digiuno intermittente. Tempo: 30 min. Porzione donna ≈ 80%.', 309, 36, 11, 13, '- Branzino 180g
- Carciofi 120g
- Olio EVO 8g
- Limone 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 301, 'digiuno', 30),
  ('cib-digiuno-cena-crema-di-ceci-con-rosmarino-3', 'cena', 'Crema di ceci con rosmarino', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 304, 11, 38, 12, '- Ceci 100g
- Olio EVO 8g
- Rosmarino 2g
- Pane integrale 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 302, 'digiuno', 20),
  ('cib-digiuno-cena-frittata-sostanziosa-4', 'cena', 'Frittata sostanziosa', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 647, 39, 48, 33, '- Uova 200g
- Patate 120g
- Cipolla 30g
- Prosciutto cotto 40g
- Olio EVO 10g
- Pane 40g', 'Cuocere patate a cubetti, aggiungere cipolla e prosciutto, versare uova e cuocere la frittata. Pane a parte.', 303, 'digiuno', 20),
  ('cib-digiuno-cena-gamberi-con-zucchine-e-menta-5', 'cena', 'Gamberi con zucchine e menta', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 226, 32, 3, 10, '- Gamberi 150g
- Zucchine 120g
- Menta 5g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 304, 'digiuno', 15),
  ('cib-digiuno-cena-insalata-tiepida-di-lenticchie-6', 'cena', 'Insalata tiepida di lenticchie', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 321, 18, 38, 9, '- Lenticchie 80g
- Carote 40g
- Sedano 30g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 305, 'digiuno', 20),
  ('cib-digiuno-cena-merluzzo-al-vapore-con-verdure-7', 'cena', 'Merluzzo al vapore con verdure', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 284, 35, 12, 9, '- Merluzzo 180g
- Broccoli 100g
- Carote 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 306, 'digiuno', 20),
  ('cib-digiuno-cena-omelette-di-albumi-con-funghi-8', 'cena', 'Omelette di albumi con funghi', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 149, 20, 2, 5, '- Albumi 150g
- Funghi 120g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 307, 'digiuno', 15),
  ('cib-digiuno-cena-pasta-al-forno-9', 'cena', 'Pasta al forno', 'Piano: Digiuno intermittente. Tempo: 30 min. Porzione donna ≈ 80%.', 754, 41, 80, 30, '- Penne 100g
- Ragù di carne 120g
- Besciamella 50g
- Mozzarella 50g
- Parmigiano 15g', 'Condire pasta con ragù, alternare con besciamella e formaggi. Forno 200° per 20 min.', 308, 'digiuno', 30),
  ('cib-digiuno-cena-pesce-con-patate-al-forno-10', 'cena', 'Pesce con patate al forno', 'Piano: Digiuno intermittente. Tempo: 35 min. Porzione donna ≈ 80%.', 502, 43, 41, 19, '- Orata filetti 200g
- Patate 200g
- Pomodorini 60g
- Olive 15g
- Olio EVO 12g', 'Mettere pesce e patate in teglia con pomodorini e olive. Forno 200° per 30 min.', 309, 'digiuno', 35),
  ('cib-digiuno-cena-petto-di-pollo-con-verdure-al-forno-11', 'cena', 'Petto di pollo con verdure al forno', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 271, 33, 5, 12, '- Petto di pollo 150g
- Zucchine 100g
- Peperoni 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 310, 'digiuno', 25),
  ('cib-digiuno-cena-pollo-con-patate-e-verdure-al-forno-12', 'cena', 'Pollo con patate e verdure al forno', 'Piano: Digiuno intermittente. Tempo: 35 min. Porzione donna ≈ 80%.', 500, 34, 32, 25, '- Coscia di pollo 200g
- Patate 180g
- Zucchine 100g
- Olio extravergine 10g', 'Infornare pollo con patate e verdure miste.', 311, 'digiuno', 35),
  ('cib-digiuno-cena-polpette-con-verdure-13', 'cena', 'Polpette con verdure', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 571, 38, 46, 26, '- Macinato misto 150g
- Pangrattato 20g
- Uovo 50g
- Passata 100g
- Zucchine 100g
- Pane 50g', 'Formare polpette, rosolare e cuocere nella passata. Zucchine grigliate a parte. Pane per accompagnare.', 312, 'digiuno', 25),
  ('cib-digiuno-cena-risotto-con-salsiccia-14', 'cena', 'Risotto con salsiccia', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 654, 25, 73, 28, '- Riso carnaroli 90g
- Salsiccia 80g
- Cipolla 20g
- Vino bianco 20g
- Parmigiano 15g', 'Sbricciolare salsiccia, rosolare con cipolla, tostare riso, sfumare e cuocere aggiungendo brodo. Mantecare con parmigiano.', 313, 'digiuno', 25),
  ('cib-digiuno-cena-salmone-con-pure-e-spinaci-15', 'cena', 'Salmone con purè e spinaci', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 556, 43, 28, 29, '- Filetto di salmone 180g
- Patate 150g
- Latte 30g
- Spinaci 100g
- Olio extravergine 8g', 'Cuocere salmone in padella, preparare pure e saltare spinaci.', 314, 'digiuno', 25),
  ('cib-digiuno-cena-salmone-con-quinoa-16', 'cena', 'Salmone con quinoa', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 638, 44, 47, 30, '- Salmone filetto 160g
- Quinoa 70g
- Spinaci 80g
- Olio EVO 8g', 'Cuocere quinoa, grigliare salmone, saltare spinaci. Comporre il piatto.', 315, 'digiuno', 20),
  ('cib-digiuno-cena-salmone-con-spinaci-e-limone-17', 'cena', 'Salmone con spinaci e limone', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 366, 34, 6, 23, '- Salmone 150g
- Spinaci 150g
- Limone 20g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 316, 'digiuno', 20),
  ('cib-digiuno-cena-sogliola-con-spinaci-al-limone-18', 'cena', 'Sogliola con spinaci al limone', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 227, 33, 4, 8, '- Sogliola 180g
- Spinaci 120g
- Limone 15g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 317, 'digiuno', 20),
  ('cib-digiuno-cena-spiedini-di-pesce-con-verdure-19', 'cena', 'Spiedini di pesce con verdure', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 269, 36, 3, 12, '- Pesce spada 100g
- Gamberi 80g
- Peperoni 60g
- Zucchine 60g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 318, 'digiuno', 20),
  ('cib-digiuno-cena-tacchino-con-cavolfiore-al-vapore-20', 'cena', 'Tacchino con cavolfiore al vapore', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 257, 33, 6, 11, '- Fesa di tacchino 140g
- Cavolfiore 150g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 319, 'digiuno', 20),
  ('cib-digiuno-cena-tagliata-con-rucola-21', 'cena', 'Tagliata con rucola', 'Piano: Digiuno intermittente. Tempo: 10 min. Porzione donna ≈ 80%.', 540, 48, 27, 26, '- Controfiletto 180g
- Rucola 40g
- Parmigiano scaglie 20g
- Olio EVO 10g
- Pane 50g', 'Grigliare al sangue, affettare e servire con rucola, parmigiano e pane.', 320, 'digiuno', 10),
  ('cib-digiuno-cena-tofu-alla-piastra-con-verdure-22', 'cena', 'Tofu alla piastra con verdure', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 217, 16, 13, 11, '- Tofu 150g
- Broccoli 100g
- Carote 60g
- Salsa di soia 10g
- Olio di sesamo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 321, 'digiuno', 15),
  ('cib-digiuno-cena-vellutata-di-finocchi-23', 'cena', 'Vellutata di finocchi', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 189, 4, 22, 8, '- Finocchi 250g
- Patata 50g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 322, 'digiuno', 25),
  ('cib-digiuno-cena-zuppa-di-verdure-con-legumi-24', 'cena', 'Zuppa di verdure con legumi', 'Piano: Digiuno intermittente. Tempo: 30 min. Porzione donna ≈ 80%.', 238, 12, 29, 6, '- Verdure miste 200g
- Lenticchie 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 323, 'digiuno', 30),
  ('cib-digiuno-colazione-acqua-e-limone-con-zenzero-25', 'colazione', 'Acqua e limone con zenzero', 'Piano: Digiuno intermittente. Tempo: 5 min. Porzione donna ≈ 80%.', 10, 0, 3, 0, '- Acqua 300g
- Limone 20g
- Zenzero 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 324, 'digiuno', 5),
  ('cib-digiuno-colazione-brodo-vegetale-leggero-26', 'colazione', 'Brodo vegetale leggero', 'Piano: Digiuno intermittente. Tempo: 10 min. Porzione donna ≈ 80%.', 13, 0, 3, 0, '- Brodo vegetale 250g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 325, 'digiuno', 10),
  ('cib-digiuno-colazione-caffe-bulletproof-27', 'colazione', 'Caffè bulletproof', 'Piano: Digiuno intermittente. Tempo: 5 min. Porzione donna ≈ 80%.', 131, 0, 0, 14, '- Caffè 200g
- Olio di cocco 10g
- Burro 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 326, 'digiuno', 5),
  ('cib-digiuno-colazione-te-verde-con-limone-28', 'colazione', 'Tè verde con limone', 'Piano: Digiuno intermittente. Tempo: 5 min. Porzione donna ≈ 80%.', 6, 0, 1, 0, '- Tè verde 300g
- Limone 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 327, 'digiuno', 5),
  ('cib-digiuno-pranzo-bowl-di-pollo-teriyaki-29', 'pranzo', 'Bowl di pollo teriyaki', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 659, 50, 90, 10, '- Riso basmati 100g
- Petto di pollo 160g
- Salsa di soia 15g
- Miele 10g
- Edamame 40g
- Olio di sesamo 5g', 'Cuocere riso, glassare pollo con soia e miele, servire con edamame.', 328, 'digiuno', 20),
  ('cib-digiuno-pranzo-bowl-di-riso-integrale-con-salmone-e-verdure-30', 'pranzo', 'Bowl di riso integrale con salmone e verdure', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 676, 36, 63, 30, '- Riso integrale 80g
- Salmone 120g
- Edamame 50g
- Avocado 40g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 329, 'digiuno', 25),
  ('cib-digiuno-pranzo-buddha-bowl-con-tahini-31', 'pranzo', 'Buddha bowl con tahini', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 397, 17, 49, 12, '- Quinoa 50g
- Ceci 50g
- Barbabietola 50g
- Cavolo riccio 50g
- Tahini 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 330, 'digiuno', 20),
  ('cib-digiuno-pranzo-crema-di-lenticchie-rosse-32', 'pranzo', 'Crema di lenticchie rosse', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 407, 20, 55, 10, '- Lenticchie rosse 80g
- Carote 40g
- Curcuma 3g
- Olio EVO 8g
- Pane integrale 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 331, 'digiuno', 25),
  ('cib-digiuno-pranzo-farro-con-tonno-e-verdure-33', 'pranzo', 'Farro con tonno e verdure', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 447, 31, 56, 11, '- Farro 80g
- Tonno al naturale 80g
- Pomodorini 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 332, 'digiuno', 20),
  ('cib-digiuno-pranzo-gnocchi-al-pesto-con-pollo-34', 'pranzo', 'Gnocchi al pesto con pollo', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 588, 34, 68, 18, '- Gnocchi 200g
- Pesto genovese 25g
- Petto di pollo 100g
- Parmigiano 10g', 'Cuocere gnocchi, grigliare pollo a fette, condire gnocchi con pesto e servire con pollo.', 333, 'digiuno', 15),
  ('cib-digiuno-pranzo-insalatona-proteica-35', 'pranzo', 'Insalatona proteica', 'Piano: Digiuno intermittente. Tempo: 10 min. Porzione donna ≈ 80%.', 640, 48, 35, 34, '- Lattuga 60g
- Tonno al naturale 80g
- Uova sode 100g
- Mais 40g
- Mozzarella 50g
- Olio EVO 12g
- Pane 50g', 'Comporre l''insalata con tutti gli ingredienti, condire con olio. Pane a parte.', 334, 'digiuno', 10),
  ('cib-digiuno-pranzo-insalatona-proteica-completa-36', 'pranzo', 'Insalatona proteica completa', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 354, 35, 9, 19, '- Pollo grigliato 120g
- Uovo sodo 60g
- Insalata mista 100g
- Mais 30g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 335, 'digiuno', 15),
  ('cib-digiuno-pranzo-orzo-con-verdure-e-feta-37', 'pranzo', 'Orzo con verdure e feta', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 372, 12, 52, 12, '- Orzo 70g
- Pomodorini 80g
- Cetriolo 60g
- Feta 30g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 336, 'digiuno', 20),
  ('cib-digiuno-pranzo-pasta-al-ragu-abbondante-38', 'pranzo', 'Pasta al ragu abbondante', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 670, 38, 73, 24, '- Pasta di semola 100g
- Carne macinata 100g
- Passata pomodoro 80g
- Parmigiano 15g
- Olio extravergine 10g', 'Cuocere pasta con ragu di carne ricco.', 337, 'digiuno', 25),
  ('cib-digiuno-pranzo-pasta-alla-norma-39', 'pranzo', 'Pasta alla norma', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 618, 19, 82, 23, '- Penne 100g
- Melanzane 150g
- Passata 100g
- Ricotta salata 20g
- Olio EVO 15g
- Basilico 3g', 'Friggere le melanzane, cuocere passata con basilico, condire la pasta e aggiungere ricotta grattugiata.', 338, 'digiuno', 20),
  ('cib-digiuno-pranzo-pasta-con-ragu-ricco-40', 'pranzo', 'Pasta con ragù ricco', 'Piano: Digiuno intermittente. Tempo: 30 min. Porzione donna ≈ 80%.', 723, 43, 78, 26, '- Rigatoni 100g
- Macinato di manzo 120g
- Passata 100g
- Carota 20g
- Cipolla 20g
- Olio EVO 10g
- Parmigiano 15g', 'Preparare ragù con macinato, passata e soffritto. Condire la pasta, aggiungere parmigiano.', 339, 'digiuno', 30),
  ('cib-digiuno-pranzo-pasta-integrale-con-verdure-e-legumi-41', 'pranzo', 'Pasta integrale con verdure e legumi', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 460, 18, 70, 12, '- Pasta integrale 80g
- Ceci 60g
- Zucchine 80g
- Pomodoro 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 340, 'digiuno', 20),
  ('cib-digiuno-pranzo-pesce-alla-griglia-con-insalata-mista-42', 'pranzo', 'Pesce alla griglia con insalata mista', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 285, 38, 3, 13, '- Orata 180g
- Insalata mista 120g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 341, 'digiuno', 20),
  ('cib-digiuno-pranzo-piadina-farcita-43', 'pranzo', 'Piadina farcita', 'Piano: Digiuno intermittente. Tempo: 5 min. Porzione donna ≈ 80%.', 560, 28, 50, 28, '- Piadina 100g
- Prosciutto crudo 40g
- Stracchino 50g
- Rucola 20g
- Pomodorini 40g', 'Scaldare la piadina, farcire con stracchino, prosciutto, rucola e pomodorini.', 342, 'digiuno', 5),
  ('cib-digiuno-pranzo-poke-bowl-vegetariano-44', 'pranzo', 'Poke bowl vegetariano', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 393, 13, 57, 12, '- Riso integrale 60g
- Edamame 60g
- Avocado 50g
- Carote 40g
- Cetriolo 40g
- Salsa di soia 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 343, 'digiuno', 15),
  ('cib-digiuno-pranzo-quinoa-con-pollo-e-avocado-45', 'pranzo', 'Quinoa con pollo e avocado', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 451, 35, 44, 13, '- Quinoa 70g
- Pollo 120g
- Avocado 40g
- Limone 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 344, 'digiuno', 20),
  ('cib-digiuno-pranzo-riso-con-curry-di-pollo-46', 'pranzo', 'Riso con curry di pollo', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 678, 43, 77, 21, '- Riso basmati 90g
- Petto di pollo 150g
- Latte di cocco 50g
- Curry 5g
- Cipolla 30g
- Olio EVO 8g', 'Saltare pollo e cipolla, aggiungere curry e latte di cocco. Servire con riso.', 345, 'digiuno', 20),
  ('cib-digiuno-pranzo-riso-con-salmone-e-avocado-bowl-47', 'pranzo', 'Riso con salmone e avocado bowl', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 695, 37, 74, 27, '- Riso basmati 90g
- Salmone fresco 120g
- Avocado 60g
- Edamame 50g', 'Comporre bowl con riso, salmone, avocado ed edamame.', 346, 'digiuno', 15),
  ('cib-digiuno-pranzo-risotto-ai-frutti-di-mare-48', 'pranzo', 'Risotto ai frutti di mare', 'Piano: Digiuno intermittente. Tempo: 30 min. Porzione donna ≈ 80%.', 606, 31, 83, 15, '- Riso carnaroli 100g
- Mix frutti di mare 150g
- Vino bianco 30g
- Aglio 3g
- Prezzemolo 5g
- Olio EVO 12g', 'Tostare riso, sfumare con vino, aggiungere brodo e frutti di mare a fine cottura.', 347, 'digiuno', 30),
  ('cib-digiuno-pranzo-soba-noodles-con-verdure-49', 'pranzo', 'Soba noodles con verdure', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 350, 14, 61, 6, '- Soba (grano saraceno) 80g
- Verdure miste 100g
- Salsa di soia 10g
- Olio di sesamo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 348, 'digiuno', 15),
  ('cib-digiuno-pranzo-vellutata-di-broccoli-con-crostini-50', 'pranzo', 'Vellutata di broccoli con crostini', 'Piano: Digiuno intermittente. Tempo: 25 min. Porzione donna ≈ 80%.', 286, 11, 37, 10, '- Broccoli 250g
- Patata 50g
- Crostini integrali 25g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 349, 'digiuno', 25),
  ('cib-digiuno-pranzo-wrap-integrale-con-hummus-e-verdure-51', 'pranzo', 'Wrap integrale con hummus e verdure', 'Piano: Digiuno intermittente. Tempo: 10 min. Porzione donna ≈ 80%.', 242, 8, 36, 8, '- Tortilla integrale 50g
- Hummus 50g
- Carote 40g
- Lattuga 30g
- Pomodoro 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 350, 'digiuno', 10),
  ('cib-digiuno-pranzo-zuppa-di-miso-con-tofu-52', 'pranzo', 'Zuppa di miso con tofu', 'Piano: Digiuno intermittente. Tempo: 20 min. Porzione donna ≈ 80%.', 314, 14, 47, 7, '- Tofu 100g
- Miso 15g
- Alga wakame 5g
- Riso integrale 60g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 351, 'digiuno', 20),
  ('cib-digiuno-spuntino-banana-con-mandorle-53', 'spuntino', 'Banana con mandorle', 'Piano: Digiuno intermittente. Tempo: 1 min. Porzione donna ≈ 80%.', 223, 6, 26, 11, '- Banana 120g
- Mandorle 20g', 'Gustare la banana con mandorle.', 352, 'digiuno', 1),
  ('cib-digiuno-spuntino-barretta-energetica-54', 'spuntino', 'Barretta energetica', 'Piano: Digiuno intermittente. Tempo: 1 min. Porzione donna ≈ 80%.', 211, 3, 39, 5, '- Barretta ai cereali 35g
- Banana 80g', 'Gustare la barretta con una banana.', 353, 'digiuno', 1),
  ('cib-digiuno-spuntino-bastoncini-di-sedano-e-carote-55', 'spuntino', 'Bastoncini di sedano e carote', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 44, 2, 9, 0, '- Sedano 80g
- Carote 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 354, 'digiuno', 0),
  ('cib-digiuno-spuntino-brodo-di-ossa-56', 'spuntino', 'Brodo di ossa', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 50, 10, 0, 1, '- Brodo di ossa 250g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 355, 'digiuno', 0),
  ('cib-digiuno-spuntino-centrifuga-verde-57', 'spuntino', 'Centrifuga verde', 'Piano: Digiuno intermittente. Tempo: 10 min. Porzione donna ≈ 80%.', 70, 2, 15, 0, '- Sedano 80g
- Cetriolo 80g
- Mela verde 80g
- Zenzero 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 356, 'digiuno', 10),
  ('cib-digiuno-spuntino-cetriolo-con-sale-e-limone-58', 'spuntino', 'Cetriolo con sale e limone', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 27, 1, 5, 0, '- Cetriolo 150g
- Limone 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 357, 'digiuno', 0),
  ('cib-digiuno-spuntino-chips-di-cavolo-riccio-59', 'spuntino', 'Chips di cavolo riccio', 'Piano: Digiuno intermittente. Tempo: 15 min. Porzione donna ≈ 80%.', 70, 2, 3, 5, '- Cavolo riccio 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 358, 'digiuno', 15),
  ('cib-digiuno-spuntino-frutta-e-cioccolato-fondente-60', 'spuntino', 'Frutta e cioccolato fondente', 'Piano: Digiuno intermittente. Tempo: 2 min. Porzione donna ≈ 80%.', 170, 2, 24, 7, '- Mela 120g
- Cioccolato fondente 70% 20g', 'Tagliare la mela a fette, accompagnare con quadretti di cioccolato.', 359, 'digiuno', 2),
  ('cib-digiuno-spuntino-frutta-secca-mista-energetica-61', 'spuntino', 'Frutta secca mista energetica', 'Piano: Digiuno intermittente. Tempo: 1 min. Porzione donna ≈ 85%.', 315, 6, 29, 20, '- Mandorle 20g
- Noci 15g
- Datteri 20g
- Uvetta 15g', 'Mix di frutta secca e disidratata per spuntino calorico.', 360, 'digiuno', 1),
  ('cib-digiuno-spuntino-gallette-con-avocado-62', 'spuntino', 'Gallette con avocado', 'Piano: Digiuno intermittente. Tempo: 3 min. Porzione donna ≈ 80%.', 173, 3, 17, 10, '- Gallette di riso 20g
- Avocado 60g
- Sale rosa 1g', 'Schiacciare avocado sulle gallette, aggiungere un pizzico di sale.', 361, 'digiuno', 3),
  ('cib-digiuno-spuntino-kefir-naturale-63', 'spuntino', 'Kefir naturale', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 72, 6, 8, 2, '- Kefir 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 362, 'digiuno', 0),
  ('cib-digiuno-spuntino-mandorle-tostate-64', 'spuntino', 'Mandorle tostate', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 115, 4, 2, 10, '- Mandorle 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 363, 'digiuno', 0),
  ('cib-digiuno-spuntino-mela-con-cannella-65', 'spuntino', 'Mela con cannella', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 85, 0, 20, 0, '- Mela 150g
- Cannella 3g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 364, 'digiuno', 0),
  ('cib-digiuno-spuntino-mix-frutta-secca-e-cocco-66', 'spuntino', 'Mix frutta secca e cocco', 'Piano: Digiuno intermittente. Tempo: 1 min. Porzione donna ≈ 80%.', 237, 6, 11, 19, '- Mandorle 15g
- Anacardi 10g
- Cocco disidratato 10g
- Uvetta 10g', 'Mescolare tutti gli ingredienti.', 365, 'digiuno', 1),
  ('cib-digiuno-spuntino-olive-verdi-67', 'spuntino', 'Olive verdi', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 39, 0, 1, 4, '- Olive verdi 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 366, 'digiuno', 0),
  ('cib-digiuno-spuntino-pane-con-burro-d-arachidi-68', 'spuntino', 'Pane con burro d''arachidi', 'Piano: Digiuno intermittente. Tempo: 2 min. Porzione donna ≈ 80%.', 210, 9, 19, 11, '- Pane integrale 40g
- Burro di arachidi 20g', 'Spalmare burro di arachidi sul pane.', 367, 'digiuno', 2),
  ('cib-digiuno-spuntino-pane-con-crema-proteica-69', 'spuntino', 'Pane con crema proteica', 'Piano: Digiuno intermittente. Tempo: 2 min. Porzione donna ≈ 80%.', 188, 8, 22, 7, '- Pane integrale 40g
- Crema di nocciole proteica 20g', 'Spalmare crema proteica sul pane.', 368, 'digiuno', 2),
  ('cib-digiuno-spuntino-pompelmo-fresco-70', 'spuntino', 'Pompelmo fresco', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 68, 1, 17, 0, '- Pompelmo 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 369, 'digiuno', 0),
  ('cib-digiuno-spuntino-semi-di-zucca-tostati-71', 'spuntino', 'Semi di zucca tostati', 'Piano: Digiuno intermittente. Porzione donna ≈ 80%.', 111, 6, 3, 9, '- Semi di zucca 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 370, 'digiuno', 0),
  ('cib-digiuno-spuntino-shake-proteico-72', 'spuntino', 'Shake proteico', 'Piano: Digiuno intermittente. Tempo: 3 min. Porzione donna ≈ 80%.', 265, 31, 25, 5, '- Latte parzialmente scremato 200g
- Proteine in polvere 30g
- Banana 60g', 'Frullare latte, proteine e banana.', 371, 'digiuno', 3),
  ('cib-digiuno-spuntino-te-matcha-73', 'spuntino', 'Tè matcha', 'Piano: Digiuno intermittente. Tempo: 5 min. Porzione donna ≈ 80%.', 6, 0, 1, 0, '- Tè matcha 2g
- Acqua calda 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 372, 'digiuno', 5),
  ('cib-digiuno-spuntino-yogurt-con-granola-74', 'spuntino', 'Yogurt con granola', 'Piano: Digiuno intermittente. Tempo: 2 min. Porzione donna ≈ 80%.', 279, 11, 27, 14, '- Yogurt greco 150g
- Granola 30g', 'Versare granola sullo yogurt.', 373, 'digiuno', 2),
  ('cib-dimagrimento-cena-bresaola-con-rucola-e-grana-75', 'cena', 'Bresaola con rucola e grana', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 258, 35, 2, 13, '- Bresaola 80g
- Rucola 60g
- Grana padano 20g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 374, 'dimagrimento', 5),
  ('cib-dimagrimento-cena-calamari-grigliati-con-insalata-76', 'cena', 'Calamari grigliati con insalata', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 90%.', 229, 24, 6, 12, '- Calamari 150g
- Insalata mista 80g
- Pomodorini 50g
- Olio EVO 10g', 'Grigliare i calamari, servire con insalata e pomodorini.', 375, 'dimagrimento', 10),
  ('cib-dimagrimento-cena-caponata-con-crostini-77', 'cena', 'Caponata con crostini', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 228, 5, 31, 9, '- Melanzane 120g
- Pomodoro 80g
- Sedano 30g
- Olive 10g
- Crostini 30g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 376, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-carpaccio-di-manzo-light-78', 'cena', 'Carpaccio di manzo light', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 252, 26, 2, 16, '- Manzo carpaccio 100g
- Rucola 40g
- Parmigiano scaglie 15g
- Olio EVO 8g
- Limone 10g', 'Disporre carpaccio su piatto, aggiungere rucola, parmigiano, olio e limone.', 377, 'dimagrimento', 5),
  ('cib-dimagrimento-cena-crema-di-piselli-con-crostini-79', 'cena', 'Crema di piselli con crostini', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 278, 11, 36, 9, '- Piselli 150g
- Cipolla 20g
- Olio EVO 8g
- Pane tostato 30g', 'Cuocere piselli con cipolla, frullare, servire con crostini e un filo di olio.', 378, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-finocchi-gratinati-80', 'cena', 'Finocchi gratinati', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 182, 8, 14, 9, '- Finocchi 250g
- Parmigiano 15g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 379, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-frittata-di-albumi-e-verdure-81', 'cena', 'Frittata di albumi e verdure', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 149, 17, 5, 5, '- Albumi 150g
- Zucchine 80g
- Peperoni 60g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 380, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-frittata-light-con-spinaci-e-ricotta-82', 'cena', 'Frittata light con spinaci e ricotta', 'Piano: Dimagrimento. Tempo: 12 min. Porzione donna ≈ 85%.', 334, 25, 18, 17, '- Uova 120g
- Spinaci 100g
- Ricotta light 60g
- Pane integrale 30g', 'Sbattere uova con spinaci e ricotta, cuocere in padella antiaderente.', 381, 'dimagrimento', 12),
  ('cib-dimagrimento-cena-insalata-di-gamberi-e-avocado-83', 'cena', 'Insalata di gamberi e avocado', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 90%.', 271, 24, 4, 16, '- Gamberi 120g
- Avocado 50g
- Insalata mista 100g
- Olio extravergine 8g', 'Saltare i gamberi, servire su insalata con avocado e limone.', 382, 'dimagrimento', 10),
  ('cib-dimagrimento-cena-insalata-di-mare-84', 'cena', 'Insalata di mare', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 258, 35, 4, 11, '- Gamberi 80g
- Calamari 80g
- Cozze 60g
- Sedano 30g
- Limone 15g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 383, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-merluzzo-con-patate-e-fagiolini-85', 'cena', 'Merluzzo con patate e fagiolini', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 90%.', 312, 30, 25, 9, '- Merluzzo 150g
- Patate 120g
- Fagiolini 100g
- Olio extravergine 8g', 'Cuocere merluzzo al forno con patate e fagiolini al vapore.', 384, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-merluzzo-con-pomodorini-al-forno-86', 'cena', 'Merluzzo con pomodorini al forno', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 199, 29, 5, 6, '- Merluzzo 160g
- Pomodorini 120g
- Olio EVO 5g
- Origano 2g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 385, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-minestrone-leggero-87', 'cena', 'Minestrone leggero', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 80%.', 147, 6, 16, 6, '- Verdure miste 250g
- Fagioli 30g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 386, 'dimagrimento', 30),
  ('cib-dimagrimento-cena-pesce-al-vapore-con-limone-88', 'cena', 'Pesce al vapore con limone', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 251, 35, 8, 7, '- Filetto di platessa 180g
- Limone 20g
- Verdure al vapore 150g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 387, 'dimagrimento', 20),
  ('cib-dimagrimento-cena-petto-di-pollo-con-verdure-grigliate-89', 'cena', 'Petto di pollo con verdure grigliate', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 90%.', 269, 33, 8, 10, '- Petto di pollo 130g
- Zucchine 100g
- Melanzane 80g
- Peperoni 60g
- Olio extravergine 8g', 'Grigliare pollo e verdure miste con olio e erbe.', 388, 'dimagrimento', 20),
  ('cib-dimagrimento-cena-petto-di-tacchino-con-insalata-90', 'cena', 'Petto di tacchino con insalata', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 211, 30, 5, 7, '- Fesa di tacchino 130g
- Insalata mista 120g
- Pomodorini 60g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 389, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-pollo-al-limone-con-rucola-91', 'cena', 'Pollo al limone con rucola', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 214, 29, 5, 8, '- Petto di pollo 130g
- Limone 20g
- Rucola 80g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 390, 'dimagrimento', 20),
  ('cib-dimagrimento-cena-pollo-alla-griglia-con-finocchi-92', 'cena', 'Pollo alla griglia con finocchi', 'Piano: Dimagrimento. Tempo: 12 min. Porzione donna ≈ 90%.', 262, 34, 9, 10, '- Petto di pollo 140g
- Finocchi 150g
- Olio EVO 8g', 'Grigliare il pollo, servire con finocchi crudi o grigliati.', 391, 'dimagrimento', 12),
  ('cib-dimagrimento-cena-sgombro-con-insalata-di-finocchi-93', 'cena', 'Sgombro con insalata di finocchi', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 360, 24, 14, 22, '- Sgombro 120g
- Finocchi 150g
- Arancia 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 392, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-sogliola-con-spinaci-94', 'cena', 'Sogliola con spinaci', 'Piano: Dimagrimento. Tempo: 12 min. Porzione donna ≈ 90%.', 229, 30, 3, 11, '- Sogliola 160g
- Spinaci 120g
- Olio EVO 8g', 'Cuocere la sogliola in padella con limone, servire con spinaci saltati.', 393, 'dimagrimento', 12),
  ('cib-dimagrimento-cena-spiedini-di-pollo-e-peperoni-95', 'cena', 'Spiedini di pollo e peperoni', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 258, 34, 9, 10, '- Petto di pollo 140g
- Peperoni 100g
- Cipolla 30g
- Olio EVO 8g', 'Alternare pollo e verdure sugli spiedini, grigliare.', 394, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-tacchino-con-peperoni-96', 'cena', 'Tacchino con peperoni', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 240, 29, 6, 10, '- Fesa di tacchino 130g
- Peperoni 150g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 395, 'dimagrimento', 20),
  ('cib-dimagrimento-cena-tacchino-con-verdure-al-vapore-97', 'cena', 'Tacchino con verdure al vapore', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 278, 33, 12, 11, '- Fesa di tacchino 150g
- Broccoli 100g
- Carota 60g
- Olio EVO 8g', 'Cuocere tacchino alla griglia, verdure al vapore, condire con olio a crudo.', 396, 'dimagrimento', 15),
  ('cib-dimagrimento-cena-tofu-saltato-con-verdure-98', 'cena', 'Tofu saltato con verdure', 'Piano: Dimagrimento. Tempo: 12 min. Porzione donna ≈ 90%.', 233, 18, 9, 14, '- Tofu 150g
- Peperoni 80g
- Zucchine 80g
- Salsa di soia 10g
- Olio EVO 8g', 'Tagliare tofu a cubetti, saltare con verdure e soia in padella.', 397, 'dimagrimento', 12),
  ('cib-dimagrimento-cena-uova-e-asparagi-99', 'cena', 'Uova e asparagi', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 90%.', 257, 19, 5, 18, '- Uova 100g
- Asparagi 150g
- Parmigiano 10g
- Olio EVO 5g', 'Grigliare asparagi, servire con uova all''occhio di bue e parmigiano.', 398, 'dimagrimento', 10),
  ('cib-dimagrimento-cena-vellutata-di-piselli-100', 'cena', 'Vellutata di piselli', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 198, 9, 25, 6, '- Piselli 150g
- Patata 40g
- Olio EVO 5g
- Menta 3g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 399, 'dimagrimento', 20),
  ('cib-dimagrimento-cena-vellutata-di-zucca-con-crostini-101', 'cena', 'Vellutata di zucca con crostini', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 90%.', 261, 7, 38, 9, '- Zucca 250g
- Patata 60g
- Pane per crostini 30g
- Olio extravergine 8g', 'Cuocere la zucca, frullare con brodo. Servire con crostini e un filo d''olio.', 400, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-zucchine-ripiene-light-102', 'cena', 'Zucchine ripiene light', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 166, 14, 9, 7, '- Zucchine 200g
- Ricotta light 80g
- Parmigiano 10g
- Pomodoro 50g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 401, 'dimagrimento', 25),
  ('cib-dimagrimento-cena-zuppa-di-pesce-103', 'cena', 'Zuppa di pesce', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 90%.', 350, 36, 19, 14, '- Mix pesce 180g
- Pomodorini 80g
- Aglio 3g
- Prezzemolo 5g
- Olio EVO 10g
- Pane tostato 30g', 'Soffriggere aglio, aggiungere pomodorini e pesce, cuocere 15 min. Servire con crostini.', 402, 'dimagrimento', 20),
  ('cib-dimagrimento-colazione-albumi-strapazzati-con-pomodoro-104', 'colazione', 'Albumi strapazzati con pomodoro', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 80%.', 162, 19, 17, 1, '- Albumi 150g
- Pomodoro 80g
- Pane integrale 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 403, 'dimagrimento', 10),
  ('cib-dimagrimento-colazione-fette-biscottate-con-ricotta-light-105', 'colazione', 'Fette biscottate con ricotta light', 'Piano: Dimagrimento. Tempo: 3 min. Porzione donna ≈ 90%.', 204, 10, 29, 5, '- Fette biscottate integrali 30g
- Ricotta light 60g
- Miele 8g', 'Spalmare ricotta sulle fette, un filo di miele sopra.', 404, 'dimagrimento', 3),
  ('cib-dimagrimento-colazione-fette-biscottate-integrali-con-miele-106', 'colazione', 'Fette biscottate integrali con miele', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 137, 3, 28, 2, '- Fette biscottate integrali 30g
- Miele 10g
- Tè verde 250g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 405, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-frullato-verde-107', 'colazione', 'Frullato verde', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 193, 11, 28, 4, '- Spinaci 40g
- Banana 80g
- Latte scremato 200g
- Semi di lino 8g', 'Frullare tutti gli ingredienti fino a ottenere un frullato liscio.', 406, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-frutta-con-yogurt-108', 'colazione', 'Frutta con yogurt', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 175, 16, 27, 1, '- Yogurt greco 0% 150g
- Mela 100g
- Kiwi 60g', 'Tagliare frutta a pezzi, mescolare con yogurt.', 407, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-gallette-con-avocado-light-109', 'colazione', 'Gallette con avocado light', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 128, 3, 20, 4, '- Gallette di riso 20g
- Avocado 30g
- Limone 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 408, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-latte-con-avena-110', 'colazione', 'Latte con avena', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 205, 10, 29, 5, '- Latte parzialmente scremato 200g
- Fiocchi d''avena 30g', 'Scaldare il latte, aggiungere i fiocchi d''avena e lasciare riposare 5 min.', 409, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-latte-scremato-con-cereali-integrali-111', 'colazione', 'Latte scremato con cereali integrali', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 171, 10, 32, 1, '- Latte scremato 200g
- Cereali integrali 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 410, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-pancake-proteici-light-112', 'colazione', 'Pancake proteici light', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 90%.', 236, 16, 37, 3, '- Albumi 100g
- Farina d''avena 30g
- Banana 60g
- Frutti di bosco 40g', 'Frullare albumi, farina e banana. Cuocere come pancake. Guarnire con frutti di bosco.', 411, 'dimagrimento', 10),
  ('cib-dimagrimento-colazione-porridge-leggero-con-mela-113', 'colazione', 'Porridge leggero con mela', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 80%.', 168, 4, 31, 2, '- Fiocchi d''avena 30g
- Acqua 200g
- Mela grattugiata 100g
- Cannella 2g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 412, 'dimagrimento', 10),
  ('cib-dimagrimento-colazione-porridge-light-114', 'colazione', 'Porridge light', 'Piano: Dimagrimento. Tempo: 8 min. Porzione donna ≈ 90%.', 232, 10, 41, 3, '- Fiocchi d''avena 35g
- Latte scremato 150g
- Mela 80g
- Cannella 2g', 'Cuocere avena nel latte, aggiungere mela a cubetti e cannella.', 413, 'dimagrimento', 8),
  ('cib-dimagrimento-colazione-ricotta-light-con-cetriolo-115', 'colazione', 'Ricotta light con cetriolo', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 193, 13, 21, 6, '- Ricotta light 100g
- Cetriolo 80g
- Pane di segale 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 414, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-smoothie-verde-detox-116', 'colazione', 'Smoothie verde detox', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 108, 3, 24, 0, '- Spinaci 50g
- Banana 60g
- Mela verde 80g
- Acqua 150g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 415, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-spremuta-con-fette-biscottate-117', 'colazione', 'Spremuta con fette biscottate', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 229, 5, 47, 2, '- Arance per spremuta 200g
- Fette biscottate 30g
- Marmellata senza zucchero 15g', 'Spremere le arance, spalmare marmellata sulle fette.', 416, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-toast-integrale-con-pomodoro-118', 'colazione', 'Toast integrale con pomodoro', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 176, 5, 24, 7, '- Pane integrale 50g
- Pomodoro 80g
- Olio EVO 5g
- Origano 1g', 'Tostare pane, condire con pomodoro, olio e origano.', 417, 'dimagrimento', 5),
  ('cib-dimagrimento-colazione-uovo-sodo-con-pane-119', 'colazione', 'Uovo sodo con pane', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 90%.', 187, 12, 18, 7, '- Uovo 60g
- Pane integrale 40g
- Pomodoro 50g', 'Lessare uovo 8 min, servire con pane e pomodoro a fette.', 418, 'dimagrimento', 10),
  ('cib-dimagrimento-colazione-yogurt-magro-con-cereali-120', 'colazione', 'Yogurt magro con cereali', 'Piano: Dimagrimento. Tempo: 3 min. Porzione donna ≈ 90%.', 191, 11, 31, 2, '- Yogurt magro 150g
- Cereali integrali 30g
- Mirtilli 30g', 'Versare cereali nello yogurt, aggiungere mirtilli.', 419, 'dimagrimento', 3),
  ('cib-dimagrimento-colazione-yogurt-magro-con-frutti-di-bosco-121', 'colazione', 'Yogurt magro con frutti di bosco', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 97, 9, 14, 0, '- Yogurt magro 150g
- Frutti di bosco 100g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 420, 'dimagrimento', 5),
  ('cib-dimagrimento-pranzo-bowl-di-bulgur-e-verdure-122', 'pranzo', 'Bowl di bulgur e verdure', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 302, 8, 47, 9, '- Bulgur 60g
- Cetrioli 60g
- Pomodorini 60g
- Cipolla rossa 15g
- Menta 3g
- Olio EVO 8g', 'Cuocere bulgur, raffreddare, condire con verdure tritate e olio (stile tabulè).', 421, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-carpaccio-di-zucchine-con-gamberetti-123', 'pranzo', 'Carpaccio di zucchine con gamberetti', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 199, 22, 5, 9, '- Zucchine 200g
- Gamberetti 100g
- Limone 15g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 422, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-cous-cous-con-pesce-124', 'pranzo', 'Cous cous con pesce', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 403, 29, 47, 10, '- Cous cous 60g
- Merluzzo 120g
- Zucchine 60g
- Pomodorini 50g
- Olio EVO 8g', 'Cuocere cous cous, saltare pesce con verdure, combinare.', 423, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-filetto-di-merluzzo-con-verdure-al-vapore-125', 'pranzo', 'Filetto di merluzzo con verdure al vapore', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 233, 30, 12, 6, '- Merluzzo 150g
- Broccoli 100g
- Carote 80g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 424, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-gazpacho-con-crostini-126', 'pranzo', 'Gazpacho con crostini', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 185, 5, 25, 6, '- Pomodori 200g
- Cetriolo 80g
- Peperone 50g
- Olio EVO 5g
- Crostini 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 425, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-insalata-di-ceci-127', 'pranzo', 'Insalata di ceci', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 261, 10, 28, 12, '- Ceci cotti 120g
- Pomodorini 80g
- Cetrioli 60g
- Cipolla rossa 20g
- Olio EVO 8g', 'Mescolare ceci con verdure tagliate, condire con olio e limone.', 426, 'dimagrimento', 5),
  ('cib-dimagrimento-pranzo-insalata-di-pollo-con-quinoa-128', 'pranzo', 'Insalata di pollo con quinoa', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 85%.', 421, 33, 40, 14, '- Quinoa 60g
- Petto di pollo 100g
- Pomodorini 80g
- Rucola 30g
- Olio extravergine 8g', 'Cuocere la quinoa, mescolare con pollo grigliato, pomodorini e rucola.', 427, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-insalata-di-pollo-e-verdure-129', 'pranzo', 'Insalata di pollo e verdure', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 210, 28, 5, 8, '- Petto di pollo grigliato 120g
- Insalata mista 120g
- Pomodorini 80g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 428, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-insalata-di-quinoa-con-verdure-130', 'pranzo', 'Insalata di quinoa con verdure', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 299, 10, 41, 8, '- Quinoa 60g
- Peperoni 80g
- Cetriolo 60g
- Pomodorini 60g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 429, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-merluzzo-al-vapore-con-verdure-131', 'pranzo', 'Merluzzo al vapore con verdure', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 90%.', 290, 30, 20, 9, '- Merluzzo 150g
- Zucchine 100g
- Peperoni 80g
- Patate 80g
- Olio extravergine 8g', 'Cuocere il merluzzo al vapore, servire con verdure grigliate.', 430, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-minestra-di-orzo-e-verdure-132', 'pranzo', 'Minestra di orzo e verdure', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 80%.', 243, 6, 40, 6, '- Orzo perlato 50g
- Verdure miste 150g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 431, 'dimagrimento', 30),
  ('cib-dimagrimento-pranzo-minestrone-leggero-133', 'pranzo', 'Minestrone leggero', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 90%.', 298, 10, 41, 10, '- Fagioli borlotti 50g
- Patate 60g
- Carota 40g
- Zucchine 60g
- Sedano 20g
- Passata 40g
- Olio EVO 8g
- Pane integrale 30g', 'Cuocere le verdure in acqua, aggiungere fagioli e passata. Servire con pane.', 432, 'dimagrimento', 30),
  ('cib-dimagrimento-pranzo-pasta-fredda-con-verdure-134', 'pranzo', 'Pasta fredda con verdure', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 295, 9, 42, 10, '- Fusilli integrali 60g
- Pomodorini 80g
- Zucchine 60g
- Basilico 3g
- Olio EVO 8g', 'Cuocere pasta, raffreddare, condire con verdure crude o grigliate e olio.', 433, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-pasta-integrale-al-pomodoro-fresco-135', 'pranzo', 'Pasta integrale al pomodoro fresco', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 262, 9, 41, 7, '- Pasta integrale 60g
- Pomodori freschi 100g
- Basilico 5g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 434, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-pasta-integrale-con-verdure-136', 'pranzo', 'Pasta integrale con verdure', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 85%.', 347, 11, 52, 10, '- Pasta integrale 70g
- Melanzane 80g
- Peperoni 60g
- Olio extravergine 8g', 'Cuocere la pasta integrale, saltare verdure con aglio e olio.', 435, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-poke-bowl-con-riso-e-salmone-137', 'pranzo', 'Poke bowl con riso e salmone', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 85%.', 471, 26, 50, 18, '- Riso basmati 60g
- Salmone fresco 80g
- Avocado 40g
- Edamame 40g', 'Comporre la bowl con riso, salmone crudo, avocado, edamame e salsa di soia.', 436, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-poke-bowl-con-riso-e-tonno-138', 'pranzo', 'Poke bowl con riso e tonno', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 80%.', 373, 31, 42, 8, '- Riso integrale 50g
- Tonno fresco 80g
- Edamame 30g
- Cetriolo 50g
- Avocado 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 437, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-pollo-al-limone-con-insalata-139', 'pranzo', 'Pollo al limone con insalata', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 90%.', 308, 36, 16, 11, '- Petto di pollo 140g
- Insalata mista 100g
- Limone 20g
- Olio EVO 8g
- Pane integrale 30g', 'Grigliare pollo con limone, servire con insalata condita e pane.', 438, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-pomodori-ripieni-di-tonno-140', 'pranzo', 'Pomodori ripieni di tonno', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 80%.', 171, 22, 6, 6, '- Pomodori grandi 200g
- Tonno al naturale 80g
- Capperi 5g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 439, 'dimagrimento', 10),
  ('cib-dimagrimento-pranzo-riso-integrale-con-lenticchie-141', 'pranzo', 'Riso integrale con lenticchie', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 80%.', 407, 17, 65, 7, '- Riso integrale 50g
- Lenticchie 60g
- Carote 40g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 440, 'dimagrimento', 30),
  ('cib-dimagrimento-pranzo-riso-integrale-con-verdure-142', 'pranzo', 'Riso integrale con verdure', 'Piano: Dimagrimento. Tempo: 20 min. Porzione donna ≈ 90%.', 334, 6, 54, 10, '- Riso integrale 60g
- Zucchine 80g
- Peperoni 60g
- Carota 40g
- Olio EVO 8g', 'Cuocere riso, saltare verdure in padella, unire tutto.', 441, 'dimagrimento', 20),
  ('cib-dimagrimento-pranzo-tartare-di-tonno-con-avocado-143', 'pranzo', 'Tartare di tonno con avocado', 'Piano: Dimagrimento. Tempo: 15 min. Porzione donna ≈ 80%.', 270, 38, 6, 10, '- Tonno fresco 120g
- Avocado 50g
- Salsa di soia 10g
- Sesamo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 442, 'dimagrimento', 15),
  ('cib-dimagrimento-pranzo-tortilla-con-tacchino-144', 'pranzo', 'Tortilla con tacchino', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 221, 19, 25, 5, '- Tortilla integrale 50g
- Fesa di tacchino 60g
- Lattuga 20g
- Pomodoro 40g
- Yogurt greco 0% 20g', 'Farcire tortilla con tacchino, verdure e yogurt, arrotolare.', 443, 'dimagrimento', 5),
  ('cib-dimagrimento-pranzo-vellutata-di-carote-e-zenzero-145', 'pranzo', 'Vellutata di carote e zenzero', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 80%.', 232, 5, 36, 6, '- Carote 200g
- Zenzero fresco 5g
- Patata 40g
- Olio EVO 5g
- Pane integrale 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 444, 'dimagrimento', 25),
  ('cib-dimagrimento-pranzo-wrap-di-lattuga-con-tonno-146', 'pranzo', 'Wrap di lattuga con tonno', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 144, 29, 5, 1, '- Lattuga iceberg 60g
- Tonno al naturale 100g
- Pomodoro 50g
- Yogurt greco 0% 30g', 'Usare foglie di lattuga come involucro, farcire con tonno, pomodoro e yogurt.', 445, 'dimagrimento', 5),
  ('cib-dimagrimento-pranzo-wrap-di-pollo-e-verdure-147', 'pranzo', 'Wrap di pollo e verdure', 'Piano: Dimagrimento. Tempo: 10 min. Porzione donna ≈ 80%.', 217, 22, 21, 4, '- Tortilla integrale 40g
- Pollo grigliato 80g
- Lattuga 30g
- Pomodoro 40g
- Yogurt greco 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 446, 'dimagrimento', 10),
  ('cib-dimagrimento-pranzo-zuppa-di-lenticchie-con-crostini-148', 'pranzo', 'Zuppa di lenticchie con crostini', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 85%.', 370, 18, 50, 10, '- Lenticchie secche 60g
- Carote 50g
- Sedano 30g
- Pane per crostini 30g
- Olio extravergine 8g', 'Cuocere le lenticchie con carote, sedano e cipolla. Servire con crostini.', 447, 'dimagrimento', 30),
  ('cib-dimagrimento-pranzo-zuppa-di-verdure-149', 'pranzo', 'Zuppa di verdure', 'Piano: Dimagrimento. Tempo: 25 min. Porzione donna ≈ 90%.', 262, 6, 38, 9, '- Patate 80g
- Carota 60g
- Zucchine 80g
- Sedano 30g
- Cipolla 30g
- Olio EVO 8g
- Pane integrale 30g', 'Cuocere tutte le verdure in acqua con sale, frullare se desiderato. Servire con pane.', 448, 'dimagrimento', 25),
  ('cib-dimagrimento-pranzo-zuppa-di-verdure-con-crostini-light-150', 'pranzo', 'Zuppa di verdure con crostini light', 'Piano: Dimagrimento. Tempo: 30 min. Porzione donna ≈ 80%.', 180, 5, 24, 7, '- Verdure miste 250g
- Crostini integrali 20g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 449, 'dimagrimento', 30),
  ('cib-dimagrimento-spuntino-anguria-fresca-151', 'spuntino', 'Anguria fresca', 'Piano: Dimagrimento. Porzione donna ≈ 80%.', 60, 1, 14, 0, '- Anguria 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 450, 'dimagrimento', 0),
  ('cib-dimagrimento-spuntino-carote-crude-con-hummus-152', 'spuntino', 'Carote crude con hummus', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 91, 3, 13, 3, '- Carote 100g
- Hummus 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 451, 'dimagrimento', 5),
  ('cib-dimagrimento-spuntino-carote-e-hummus-153', 'spuntino', 'Carote e hummus', 'Piano: Dimagrimento. Tempo: 3 min. Porzione donna ≈ 90%.', 99, 3, 13, 3, '- Carote 120g
- Hummus 30g', 'Tagliare le carote a bastoncini e intingere nell''hummus.', 452, 'dimagrimento', 3),
  ('cib-dimagrimento-spuntino-centrifuga-di-verdure-154', 'spuntino', 'Centrifuga di verdure', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 90%.', 96, 2, 21, 0, '- Carota 100g
- Sedano 80g
- Mela verde 80g', 'Centrifugare carota, sedano e mela.', 453, 'dimagrimento', 5),
  ('cib-dimagrimento-spuntino-edamame-155', 'spuntino', 'Edamame', 'Piano: Dimagrimento. Tempo: 3 min. Porzione donna ≈ 90%.', 98, 9, 6, 4, '- Edamame sgusciati 80g', 'Scaldare edamame con un pizzico di sale.', 454, 'dimagrimento', 3),
  ('cib-dimagrimento-spuntino-finocchio-crudo-156', 'spuntino', 'Finocchio crudo', 'Piano: Dimagrimento. Tempo: 3 min. Porzione donna ≈ 90%.', 47, 2, 9, 0, '- Finocchio 150g', 'Tagliare il finocchio a spicchi e gustare crudo.', 455, 'dimagrimento', 3),
  ('cib-dimagrimento-spuntino-finocchio-crudo-157', 'spuntino', 'Finocchio crudo', 'Piano: Dimagrimento. Porzione donna ≈ 80%.', 47, 2, 8, 0, '- Finocchio 150g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 456, 'dimagrimento', 0),
  ('cib-dimagrimento-spuntino-gallette-con-ricotta-light-158', 'spuntino', 'Gallette con ricotta light', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 90%.', 120, 6, 18, 3, '- Gallette di riso 20g
- Ricotta light 40g', 'Spalmare ricotta sulle gallette.', 457, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-gelatina-di-frutta-159', 'spuntino', 'Gelatina di frutta', 'Piano: Dimagrimento. Porzione donna ≈ 80%.', 72, 2, 16, 0, '- Gelatina di frutta 120g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 458, 'dimagrimento', 0),
  ('cib-dimagrimento-spuntino-gelatina-proteica-160', 'spuntino', 'Gelatina proteica', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 90%.', 50, 10, 2, 0, '- Gelatina proteica 120g', 'Servire dalla confezione o preparare con proteine e gelatina alimentare.', 459, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-kefir-con-semi-di-lino-161', 'spuntino', 'Kefir con semi di lino', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 90%.', 141, 7, 6, 9, '- Kefir 150g
- Semi di lino 8g', 'Versare kefir in un bicchiere, aggiungere semi di lino.', 460, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-mela-verde-con-cannella-162', 'spuntino', 'Mela verde con cannella', 'Piano: Dimagrimento. Porzione donna ≈ 80%.', 77, 0, 18, 0, '- Mela verde 150g
- Cannella 2g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 461, 'dimagrimento', 0),
  ('cib-dimagrimento-spuntino-mela-verde-con-mandorle-163', 'spuntino', 'Mela verde con mandorle', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 90%.', 136, 2, 19, 5, '- Mela verde 150g
- Mandorle 10g', 'Tagliare la mela a fette, accompagnare con mandorle.', 462, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-pomodorini-con-mozzarelline-164', 'spuntino', 'Pomodorini con mozzarelline', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 66, 6, 2, 3, '- Pomodorini 80g
- Mozzarelline light 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 463, 'dimagrimento', 5),
  ('cib-dimagrimento-spuntino-tisana-e-gallette-165', 'spuntino', 'Tisana e gallette', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 60, 1, 13, 0, '- Tisana 250g
- Gallette di riso 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 464, 'dimagrimento', 5),
  ('cib-dimagrimento-spuntino-yogurt-greco-0-con-frutti-di-bosco-166', 'spuntino', 'Yogurt greco 0% con frutti di bosco', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 90%.', 91, 13, 10, 0, '- Yogurt greco 0% 120g
- Frutti di bosco 50g', 'Versare frutti di bosco sullo yogurt.', 465, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-yogurt-magro-con-cannella-167', 'spuntino', 'Yogurt magro con cannella', 'Piano: Dimagrimento. Tempo: 2 min. Porzione donna ≈ 95%.', 57, 10, 6, 0, '- Yogurt bianco 0% 150g', 'Yogurt bianco magro con una spolverata di cannella.', 466, 'dimagrimento', 2),
  ('cib-dimagrimento-spuntino-yogurt-magro-con-kiwi-168', 'spuntino', 'Yogurt magro con kiwi', 'Piano: Dimagrimento. Tempo: 5 min. Porzione donna ≈ 80%.', 97, 8, 15, 0, '- Yogurt magro 125g
- Kiwi 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 467, 'dimagrimento', 5),
  ('cib-keto-cena-bistecca-con-burro-e-asparagi-169', 'cena', 'Bistecca con burro e asparagi', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 446, 39, 4, 29, '- Bistecca di manzo 180g
- Burro 10g
- Asparagi 150g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 468, 'keto', 20),
  ('cib-keto-cena-bistecca-con-funghi-e-spinaci-170', 'cena', 'Bistecca con funghi e spinaci', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 423, 42, 3, 26, '- Bistecca manzo 180g
- Funghi 100g
- Spinaci 100g
- Burro 10g', 'Grigliare la bistecca, saltare funghi e spinaci con aglio e burro.', 469, 'keto', 15),
  ('cib-keto-cena-branzino-al-sale-171', 'cena', 'Branzino al sale', 'Piano: Cheto. Tempo: 35 min. Porzione donna ≈ 80%.', 350, 44, 2, 18, '- Branzino intero 250g
- Sale grosso 500g
- Insalata mista 80g
- Olio EVO 12g', 'Coprire il branzino di sale grosso, cuocere in forno a 220° per 30 min. Rompere la crosta di sale, servire con insalata.', 470, 'keto', 35),
  ('cib-keto-cena-cotoletta-di-pollo-impanata-keto-172', 'cena', 'Cotoletta di pollo impanata keto', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 473, 40, 1, 33, '- Petto di pollo 150g
- Farina di mandorle 20g
- Parmigiano 15g
- Olio per frittura 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 471, 'keto', 20),
  ('cib-keto-cena-fettine-di-vitello-con-funghi-173', 'cena', 'Fettine di vitello con funghi', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 272, 34, 1, 13, '- Vitello 150g
- Funghi porcini 120g
- Burro 10g
- Prezzemolo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 472, 'keto', 20),
  ('cib-keto-cena-filetto-di-salmone-con-burro-alle-erbe-174', 'cena', 'Filetto di salmone con burro alle erbe', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 449, 36, 0, 32, '- Salmone 180g
- Burro 15g
- Erbe aromatiche 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 473, 'keto', 20),
  ('cib-keto-cena-frittata-con-salsiccia-175', 'cena', 'Frittata con salsiccia', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 491, 32, 6, 38, '- Uova 150g
- Salsiccia 80g
- Peperoni 60g', 'Sbricciolare la salsiccia, rosolare con peperoni, versare le uova e cuocere la frittata.', 474, 'keto', 15),
  ('cib-keto-cena-gamberoni-all-aglio-con-spinaci-176', 'cena', 'Gamberoni all''aglio con spinaci', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 323, 44, 4, 15, '- Gamberoni 200g
- Spinaci 150g
- Burro all''aglio 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 475, 'keto', 15),
  ('cib-keto-cena-gamberoni-alla-griglia-177', 'cena', 'Gamberoni alla griglia', 'Piano: Cheto. Tempo: 12 min. Porzione donna ≈ 80%.', 299, 38, 6, 14, '- Gamberoni 200g
- Zucchine grigliate 120g
- Olio EVO 12g
- Limone 15g', 'Grigliare i gamberoni con olio e limone. Servire con zucchine grigliate.', 476, 'keto', 12),
  ('cib-keto-cena-involtini-di-zucchine-con-ricotta-178', 'cena', 'Involtini di zucchine con ricotta', 'Piano: Cheto. Tempo: 25 min. Porzione donna ≈ 85%.', 293, 20, 9, 18, '- Zucchine 200g
- Ricotta 100g
- Spinaci 60g
- Mozzarella 40g', 'Affettare zucchine sottili, farcire con ricotta e spinaci. Infornare con mozzarella.', 477, 'keto', 25),
  ('cib-keto-cena-maiale-con-cavoletti-179', 'cena', 'Maiale con cavoletti', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 401, 42, 8, 23, '- Lonza di maiale 160g
- Cavoletti di Bruxelles 150g
- Pancetta 20g
- Olio EVO 8g', 'Cuocere la lonza in padella, saltare cavoletti con pancetta e olio.', 478, 'keto', 20),
  ('cib-keto-cena-maiale-con-cavolo-saltato-180', 'cena', 'Maiale con cavolo saltato', 'Piano: Cheto. Tempo: 25 min. Porzione donna ≈ 80%.', 374, 29, 6, 26, '- Braciola di maiale 150g
- Cavolo 150g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 479, 'keto', 25),
  ('cib-keto-cena-pesce-spada-grigliato-181', 'cena', 'Pesce spada grigliato', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 348, 36, 4, 21, '- Pesce spada 180g
- Insalata mista 80g
- Pomodorini 60g
- Olio EVO 10g', 'Grigliare il pesce spada, servire con insalata e pomodorini.', 480, 'keto', 10),
  ('cib-keto-cena-petto-d-anatra-con-insalata-182', 'cena', 'Petto d''anatra con insalata', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 412, 28, 4, 31, '- Petto d''anatra 150g
- Insalata mista 100g
- Noci 10g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 481, 'keto', 20),
  ('cib-keto-cena-petto-d-anatra-con-spinaci-183', 'cena', 'Petto d''anatra con spinaci', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 359, 33, 3, 24, '- Petto d''anatra 150g
- Spinaci 120g
- Burro 8g
- Olio EVO 8g', 'Cuocere petto d''anatra pelle in giù, girare e completare. Saltare spinaci nel burro.', 482, 'keto', 15),
  ('cib-keto-cena-pollo-al-curry-con-verdure-184', 'cena', 'Pollo al curry con verdure', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 308, 38, 8, 13, '- Petto di pollo 150g
- Latte di cocco 60g
- Peperoni 80g
- Zucchine 80g', 'Cuocere il pollo con latte di cocco e curry. Aggiungere peperoni e zucchine.', 483, 'keto', 20),
  ('cib-keto-cena-pollo-al-limone-con-asparagi-185', 'cena', 'Pollo al limone con asparagi', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 323, 44, 5, 14, '- Petto di pollo 180g
- Asparagi 120g
- Limone 20g
- Olio EVO 12g', 'Cuocere il pollo con limone e olio, servire con asparagi grigliati.', 484, 'keto', 15),
  ('cib-keto-cena-pollo-arrosto-con-broccoli-186', 'cena', 'Pollo arrosto con broccoli', 'Piano: Cheto. Tempo: 35 min. Porzione donna ≈ 80%.', 413, 29, 7, 29, '- Coscia di pollo 180g
- Broccoli 150g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 485, 'keto', 35),
  ('cib-keto-cena-salmone-con-crema-di-cavolfiore-187', 'cena', 'Salmone con crema di cavolfiore', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 457, 39, 6, 30, '- Filetto di salmone 150g
- Cavolfiore 200g
- Parmigiano 15g
- Burro 10g', 'Cuocere il salmone in padella. Preparare crema di cavolfiore con parmigiano.', 486, 'keto', 20),
  ('cib-keto-cena-salmone-in-crosta-di-erbe-188', 'cena', 'Salmone in crosta di erbe', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 503, 39, 7, 35, '- Salmone filetto 170g
- Mandorle tritate 15g
- Erbe aromatiche 5g
- Fagiolini 100g
- Olio EVO 8g', 'Panare salmone con mandorle e erbe, cuocere in forno 200° per 15 min. Fagiolini al vapore.', 487, 'keto', 20),
  ('cib-keto-cena-seppie-con-piselli-pochi-189', 'cena', 'Seppie con piselli (pochi)', 'Piano: Cheto. Tempo: 30 min. Porzione donna ≈ 80%.', 261, 31, 9, 11, '- Seppie 180g
- Piselli 40g
- Olio EVO 10g
- Pomodoro 50g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 488, 'keto', 30),
  ('cib-keto-cena-sgombro-con-insalata-di-avocado-190', 'cena', 'Sgombro con insalata di avocado', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 490, 30, 3, 39, '- Sgombro 150g
- Avocado 80g
- Cetrioli 80g
- Olio extravergine 5g', 'Grigliare lo sgombro, servire con insalata di avocado e cetrioli.', 489, 'keto', 15),
  ('cib-keto-cena-stracotto-con-cavolfiore-191', 'cena', 'Stracotto con cavolfiore', 'Piano: Cheto. Tempo: 60 min. Porzione donna ≈ 80%.', 365, 33, 6, 23, '- Manzo per stracotto 150g
- Cavolfiore 150g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 490, 'keto', 60),
  ('cib-keto-cena-tagliata-con-verdure-192', 'cena', 'Tagliata con verdure', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 344, 38, 4, 19, '- Controfiletto di manzo 180g
- Rucola 40g
- Pomodorini 60g
- Olio EVO 10g', 'Grigliare la carne al sangue, tagliare a fette, servire con rucola e pomodorini.', 491, 'keto', 10),
  ('cib-keto-cena-tofu-saltato-con-verdure-193', 'cena', 'Tofu saltato con verdure', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 249, 16, 10, 16, '- Tofu 150g
- Peperoni 80g
- Broccoli 100g
- Olio di sesamo 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 492, 'keto', 15),
  ('cib-keto-cena-trota-al-forno-con-verdure-194', 'cena', 'Trota al forno con verdure', 'Piano: Cheto. Tempo: 30 min. Porzione donna ≈ 80%.', 337, 38, 4, 17, '- Trota 180g
- Zucchine 100g
- Pomodorini 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 493, 'keto', 30),
  ('cib-keto-cena-vitello-tonnato-195', 'cena', 'Vitello tonnato', 'Piano: Cheto. Tempo: 50 min. Porzione donna ≈ 80%.', 387, 40, 1, 25, '- Girello di vitello 150g
- Tonno sott''olio 40g
- Capperi 10g
- Maionese 20g', 'Lessare il vitello, affettare. Frullare tonno con maionese e capperi per la salsa.', 494, 'keto', 50),
  ('cib-keto-colazione-bacon-con-uova-e-avocado-196', 'colazione', 'Bacon con uova e avocado', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 428, 24, 2, 35, '- Bacon 40g
- Uova 100g
- Avocado 70g', 'Cuocere bacon croccante, friggere le uova, servire con avocado a fette.', 495, 'keto', 10),
  ('cib-keto-colazione-budino-di-chia-al-cacao-197', 'colazione', 'Budino di chia al cacao', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 280, 7, 7, 23, '- Semi di chia 25g
- Latte di cocco 150g
- Cacao amaro 10g
- Eritritolo 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 496, 'keto', 5),
  ('cib-keto-colazione-crepe-di-farina-di-cocco-198', 'colazione', 'Crêpe di farina di cocco', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 426, 18, 7, 36, '- Farina di cocco 20g
- Uova 100g
- Latte di cocco 30g
- Burro 8g
- Crema di nocciole senza zucchero 15g', 'Mescolare farina di cocco, uova e latte di cocco. Cuocere come crêpe, farcire con crema.', 497, 'keto', 15),
  ('cib-keto-colazione-frittata-al-formaggio-e-spinaci-199', 'colazione', 'Frittata al formaggio e spinaci', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 366, 24, 3, 29, '- Uova 120g
- Spinaci 60g
- Formaggio cheddar 30g
- Burro 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 498, 'keto', 10),
  ('cib-keto-colazione-frittata-al-forno-con-formaggio-200', 'colazione', 'Frittata al forno con formaggio', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 390, 27, 2, 31, '- Uova 150g
- Emmental 30g
- Burro 8g', 'Sbattere le uova con formaggio grattugiato, cuocere in forno a 180° per 15 min.', 499, 'keto', 20),
  ('cib-keto-colazione-mousse-di-ricotta-con-cacao-201', 'colazione', 'Mousse di ricotta con cacao', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 325, 18, 8, 25, '- Ricotta intera 150g
- Cacao amaro 8g
- Eritritolo 10g
- Mandorle 15g', 'Frullare ricotta con cacao e eritritolo. Servire con mandorle a lamelle.', 500, 'keto', 5),
  ('cib-keto-colazione-omelette-con-salmone-affumicato-202', 'colazione', 'Omelette con salmone affumicato', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 281, 25, 2, 19, '- Uova 120g
- Salmone affumicato 40g
- Crema di formaggio 20g
- Erba cipollina 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 501, 'keto', 10),
  ('cib-keto-colazione-omelette-con-spinaci-e-feta-203', 'colazione', 'Omelette con spinaci e feta', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 369, 23, 3, 29, '- Uova intere 120g
- Spinaci freschi 80g
- Feta 40g
- Burro 10g', 'Sbattere le uova, aggiungere spinaci saltati e feta sbriciolata. Cuocere in padella.', 502, 'keto', 10),
  ('cib-keto-colazione-pancake-di-cocco-keto-204', 'colazione', 'Pancake di cocco keto', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 232, 10, 3, 19, '- Farina di cocco 20g
- Uova 60g
- Burro 10g
- Eritritolo 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 503, 'keto', 15),
  ('cib-keto-colazione-pancake-proteici-keto-al-cocco-205', 'colazione', 'Pancake proteici keto al cocco', 'Piano: Cheto. Tempo: 12 min. Porzione donna ≈ 80%.', 357, 20, 5, 28, '- Uova 120g
- Farina di cocco 20g
- Formaggio cremoso 30g', 'Mescolare uova, farina di cocco e formaggio cremoso. Cuocere in padella come piccoli pancake.', 504, 'keto', 12),
  ('cib-keto-colazione-salmone-affumicato-con-crema-di-avocado-206', 'colazione', 'Salmone affumicato con crema di avocado', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 309, 20, 1, 24, '- Salmone affumicato 80g
- Avocado 80g
- Olio extravergine 5g', 'Schiacciare l''avocado con limone e pepe, servire con fette di salmone affumicato.', 505, 'keto', 5),
  ('cib-keto-colazione-uova-al-bacon-con-avocado-207', 'colazione', 'Uova al bacon con avocado', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 408, 20, 6, 34, '- Uova 120g
- Bacon 30g
- Avocado 60g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 506, 'keto', 10),
  ('cib-keto-colazione-uova-al-tegamino-con-avocado-e-formaggio-208', 'colazione', 'Uova al tegamino con avocado e formaggio', 'Piano: Cheto. Tempo: 8 min. Porzione donna ≈ 80%.', 423, 24, 2, 35, '- Uova intere 120g
- Avocado 80g
- Grana Padano 20g
- Olio extravergine 5g', 'Cuocere le uova al tegamino con olio, servire con avocado e formaggio a scaglie.', 507, 'keto', 8),
  ('cib-keto-colazione-yogurt-greco-intero-con-noci-209', 'colazione', 'Yogurt greco intero con noci', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 80%.', 326, 14, 9, 27, '- Yogurt greco intero 170g
- Noci 25g', 'Servire yogurt greco con noci spezzate sopra.', 508, 'keto', 3),
  ('cib-keto-colazione-yogurt-greco-intero-con-noci-e-cocco-210', 'colazione', 'Yogurt greco intero con noci e cocco', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 80%.', 386, 15, 10, 32, '- Yogurt greco intero 170g
- Noci sgusciate 25g
- Cocco rape 10g', 'Versare le noci tritate e il cocco rape sullo yogurt.', 509, 'keto', 3),
  ('cib-keto-colazione-yogurt-greco-intero-con-semi-di-chia-211', 'colazione', 'Yogurt greco intero con semi di chia', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 286, 12, 7, 21, '- Yogurt greco intero 150g
- Semi di chia 15g
- Noci 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 510, 'keto', 5),
  ('cib-keto-pranzo-carpaccio-di-manzo-con-rucola-212', 'pranzo', 'Carpaccio di manzo con rucola', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 350, 34, 3, 24, '- Manzo carpaccio 120g
- Rucola 40g
- Parmigiano scaglie 25g
- Olio EVO 12g
- Limone 15g', 'Disporre il carpaccio, coprire con rucola, scaglie di parmigiano, olio e limone.', 511, 'keto', 5),
  ('cib-keto-pranzo-carpaccio-di-manzo-con-rucola-213', 'pranzo', 'Carpaccio di manzo con rucola', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 327, 33, 2, 21, '- Carpaccio di manzo 120g
- Rucola 60g
- Parmigiano 20g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 512, 'keto', 5),
  ('cib-keto-pranzo-cavolfiore-al-gratin-214', 'pranzo', 'Cavolfiore al gratin', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 369, 14, 12, 30, '- Cavolfiore 250g
- Panna 40g
- Emmental 30g
- Burro 8g', 'Lessare il cavolfiore, condire con panna, coprire con emmental e gratinare in forno.', 513, 'keto', 20),
  ('cib-keto-pranzo-cavolfiore-gratinato-215', 'pranzo', 'Cavolfiore gratinato', 'Piano: Cheto. Tempo: 25 min. Porzione donna ≈ 80%.', 297, 13, 11, 24, '- Cavolfiore 250g
- Panna 30g
- Parmigiano 20g
- Burro 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 514, 'keto', 25),
  ('cib-keto-pranzo-fettine-di-vitello-con-funghi-216', 'pranzo', 'Fettine di vitello con funghi', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 271, 34, 2, 13, '- Vitello fettine 150g
- Funghi champignon 120g
- Burro 10g
- Prezzemolo 3g
- Aglio 3g', 'Saltare le fettine nel burro, aggiungere funghi trifolati con aglio e prezzemolo.', 515, 'keto', 15),
  ('cib-keto-pranzo-hamburger-senza-pane-con-insalata-217', 'pranzo', 'Hamburger senza pane con insalata', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 410, 32, 4, 29, '- Hamburger di manzo 150g
- Lattuga 80g
- Formaggio 20g
- Pomodoro 50g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 516, 'keto', 15),
  ('cib-keto-pranzo-hamburger-senza-pane-con-verdure-218', 'pranzo', 'Hamburger senza pane con verdure', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 361, 37, 3, 22, '- Carne macinata magra 150g
- Formaggio cheddar 30g
- Lattuga 40g
- Pomodoro 50g', 'Formare l''hamburger con carne macinata, grigliare. Servire avvolto in lattuga con formaggio.', 517, 'keto', 15),
  ('cib-keto-pranzo-insalata-caesar-con-pollo-219', 'pranzo', 'Insalata Caesar con pollo', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 415, 45, 3, 24, '- Petto di pollo 150g
- Lattuga romana 100g
- Parmigiano 25g
- Olio extravergine 15g', 'Grigliare il pollo, servire su lattuga con parmigiano, olio e limone.', 518, 'keto', 15),
  ('cib-keto-pranzo-insalata-caesar-senza-crostini-220', 'pranzo', 'Insalata Caesar senza crostini', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 330, 39, 4, 17, '- Pollo grigliato 150g
- Lattuga romana 100g
- Parmigiano 20g
- Salsa Caesar 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 519, 'keto', 15),
  ('cib-keto-pranzo-insalata-greca-senza-pane-221', 'pranzo', 'Insalata greca senza pane', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 431, 14, 13, 38, '- Cetrioli 100g
- Pomodori 100g
- Feta 80g
- Olive nere 30g
- Cipolla rossa 20g
- Olio EVO 15g
- Origano 1g', 'Tagliare verdure a pezzi, aggiungere feta a cubetti, olive, condire con olio e origano.', 520, 'keto', 10),
  ('cib-keto-pranzo-involtini-di-prosciutto-e-formaggio-222', 'pranzo', 'Involtini di prosciutto e formaggio', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 297, 23, 3, 22, '- Prosciutto crudo 80g
- Formaggio spalmabile 40g
- Rucola 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 521, 'keto', 5),
  ('cib-keto-pranzo-parmigiana-di-zucchine-223', 'pranzo', 'Parmigiana di zucchine', 'Piano: Cheto. Tempo: 25 min. Porzione donna ≈ 80%.', 376, 22, 10, 28, '- Zucchine 250g
- Mozzarella 60g
- Parmigiano 20g
- Passata 80g
- Olio EVO 10g', 'Grigliare le zucchine, alternare strati con passata, mozzarella e parmigiano. Forno 180° per 20 min.', 522, 'keto', 25),
  ('cib-keto-pranzo-pollo-al-pesto-con-verdure-224', 'pranzo', 'Pollo al pesto con verdure', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 335, 35, 3, 19, '- Petto di pollo 150g
- Pesto 30g
- Zucchine grigliate 100g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 523, 'keto', 20),
  ('cib-keto-pranzo-pollo-ripieno-di-spinaci-225', 'pranzo', 'Pollo ripieno di spinaci', 'Piano: Cheto. Tempo: 30 min. Porzione donna ≈ 80%.', 362, 46, 3, 19, '- Petto di pollo 180g
- Spinaci 80g
- Philadelphia 30g
- Olio EVO 8g', 'Aprire il petto a libro, farcire con spinaci saltati e Philadelphia, arrotolare e cuocere in forno a 200° per 25 min.', 524, 'keto', 30),
  ('cib-keto-pranzo-polpette-al-forno-senza-pane-226', 'pranzo', 'Polpette al forno senza pane', 'Piano: Cheto. Tempo: 25 min. Porzione donna ≈ 80%.', 440, 43, 2, 29, '- Macinato di manzo 150g
- Uovo 50g
- Parmigiano 15g
- Insalata verde 80g
- Olio EVO 8g', 'Impastare macinato con uovo e parmigiano, formare polpette, cuocere in forno a 200° per 20 min. Servire con insalata.', 525, 'keto', 25),
  ('cib-keto-pranzo-salmone-con-avocado-e-spinaci-227', 'pranzo', 'Salmone con avocado e spinaci', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 472, 35, 2, 34, '- Filetto di salmone 150g
- Avocado 80g
- Spinaci 100g
- Olio extravergine 5g', 'Cuocere il salmone in padella, servire con avocado a fette e spinaci saltati.', 526, 'keto', 15),
  ('cib-keto-pranzo-salmone-con-crema-di-avocado-228', 'pranzo', 'Salmone con crema di avocado', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 413, 32, 7, 28, '- Salmone 150g
- Avocado 80g
- Limone 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 527, 'keto', 20),
  ('cib-keto-pranzo-sgombro-con-insalata-greca-229', 'pranzo', 'Sgombro con insalata greca', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 459, 35, 6, 32, '- Sgombro 150g
- Cetriolo 80g
- Pomodoro 80g
- Feta 40g
- Olive 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 528, 'keto', 10),
  ('cib-keto-pranzo-stracchino-con-noci-e-sedano-230', 'pranzo', 'Stracchino con noci e sedano', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 509, 23, 4, 45, '- Stracchino 100g
- Noci 30g
- Sedano 80g', 'Servire stracchino con sedano a bastoncino e noci.', 529, 'keto', 5),
  ('cib-keto-pranzo-tacchino-con-crema-di-funghi-231', 'pranzo', 'Tacchino con crema di funghi', 'Piano: Cheto. Tempo: 20 min. Porzione donna ≈ 80%.', 349, 38, 2, 20, '- Tacchino 150g
- Funghi 120g
- Panna 40g
- Burro 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 530, 'keto', 20),
  ('cib-keto-pranzo-tartare-di-salmone-232', 'pranzo', 'Tartare di salmone', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 424, 32, 2, 31, '- Salmone fresco 150g
- Avocado 60g
- Cipollotto 10g
- Salsa di soia 10g
- Olio di sesamo 5g', 'Tagliare salmone a cubetti, condire con soia e sesamo, servire con avocado.', 531, 'keto', 10),
  ('cib-keto-pranzo-tonno-con-insalata-di-avocado-233', 'pranzo', 'Tonno con insalata di avocado', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 348, 33, 8, 20, '- Tonno al naturale 120g
- Avocado 80g
- Pomodorini 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 532, 'keto', 10),
  ('cib-keto-pranzo-tonno-in-crosta-di-sesamo-234', 'pranzo', 'Tonno in crosta di sesamo', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 399, 41, 4, 24, '- Trancio di tonno 160g
- Semi di sesamo 15g
- Zucchine 100g
- Olio EVO 10g', 'Panare il tonno nel sesamo, scottare in padella. Servire con zucchine grigliate.', 533, 'keto', 10),
  ('cib-keto-pranzo-uova-alla-fiorentina-235', 'pranzo', 'Uova alla fiorentina', 'Piano: Cheto. Tempo: 15 min. Porzione donna ≈ 80%.', 340, 24, 5, 25, '- Uova 120g
- Spinaci 150g
- Parmigiano 15g
- Burro 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 534, 'keto', 15),
  ('cib-keto-pranzo-uova-con-pancetta-e-avocado-236', 'pranzo', 'Uova con pancetta e avocado', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 468, 23, 2, 40, '- Uova 120g
- Pancetta 40g
- Avocado 80g', 'Cuocere la pancetta croccante, le uova al tegamino, servire con avocado.', 535, 'keto', 10),
  ('cib-keto-pranzo-zucchine-ripiene-con-carne-e-formaggio-237', 'pranzo', 'Zucchine ripiene con carne e formaggio', 'Piano: Cheto. Tempo: 30 min. Porzione donna ≈ 80%.', 360, 33, 4, 23, '- Zucchine 200g
- Carne macinata 120g
- Mozzarella 40g
- Olio extravergine 5g', 'Svuotare le zucchine, farcire con carne e formaggio, infornare 20 min.', 536, 'keto', 30),
  ('cib-keto-pranzo-zucchine-ripiene-con-carne-e-formaggio-238', 'pranzo', 'Zucchine ripiene con carne e formaggio', 'Piano: Cheto. Tempo: 30 min. Porzione donna ≈ 80%.', 379, 30, 4, 26, '- Zucchine 200g
- Carne macinata 100g
- Mozzarella 40g
- Parmigiano 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 537, 'keto', 30),
  ('cib-keto-spuntino-avocado-con-salmone-affumicato-239', 'spuntino', 'Avocado con salmone affumicato', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 85%.', 164, 10, 1, 13, '- Avocado 60g
- Salmone affumicato 40g', 'Tagliare l''avocado a meta, farcire con salmone affumicato.', 538, 'keto', 3),
  ('cib-keto-spuntino-bresaola-e-grana-240', 'spuntino', 'Bresaola e grana', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 80%.', 186, 20, 1, 12, '- Bresaola 40g
- Grana Padano 20g
- Rucola 15g
- Olio EVO 5g', 'Arrotolare bresaola con scaglie di grana e rucola.', 539, 'keto', 3),
  ('cib-keto-spuntino-burro-di-mandorle-con-sedano-241', 'spuntino', 'Burro di mandorle con sedano', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 80%.', 138, 5, 4, 11, '- Burro di mandorle 20g
- Sedano 100g', 'Spalmare burro di mandorle nei bastoncini di sedano.', 540, 'keto', 3),
  ('cib-keto-spuntino-cetrioli-con-tzatziki-242', 'spuntino', 'Cetrioli con tzatziki', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 142, 6, 7, 10, '- Cetrioli 120g
- Yogurt greco 80g
- Aglio 2g
- Olio EVO 5g', 'Grattugiare cetriolo nello yogurt, aggiungere aglio e olio. Intingere bastoncini di cetriolo.', 541, 'keto', 5),
  ('cib-keto-spuntino-cioccolato-fondente-85-con-mandorle-243', 'spuntino', 'Cioccolato fondente 85% con mandorle', 'Piano: Cheto. Tempo: 1 min. Porzione donna ≈ 85%.', 195, 5, 5, 18, '- Cioccolato fondente 85% 20g
- Mandorle 15g', 'Spezzare il cioccolato fondente e accompagnare con mandorle.', 542, 'keto', 1),
  ('cib-keto-spuntino-cioccolato-fondente-90-244', 'spuntino', 'Cioccolato fondente 90%', 'Piano: Cheto. Porzione donna ≈ 80%.', 109, 2, 3, 10, '- Cioccolato fondente 90% 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 543, 'keto', 0),
  ('cib-keto-spuntino-cubetti-di-formaggio-e-olive-245', 'spuntino', 'Cubetti di formaggio e olive', 'Piano: Cheto. Porzione donna ≈ 80%.', 147, 8, 0, 12, '- Formaggio stagionato 30g
- Olive 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 544, 'keto', 0),
  ('cib-keto-spuntino-involtini-di-salame-e-formaggio-246', 'spuntino', 'Involtini di salame e formaggio', 'Piano: Cheto. Porzione donna ≈ 80%.', 129, 4, 1, 12, '- Salame 20g
- Formaggio spalmabile 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 545, 'keto', 0),
  ('cib-keto-spuntino-noci-di-macadamia-247', 'spuntino', 'Noci di macadamia', 'Piano: Cheto. Porzione donna ≈ 80%.', 180, 2, 1, 19, '- Noci di macadamia 25g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 546, 'keto', 0),
  ('cib-keto-spuntino-noci-e-formaggio-248', 'spuntino', 'Noci e formaggio', 'Piano: Cheto. Tempo: 2 min. Porzione donna ≈ 80%.', 249, 13, 1, 22, '- Noci 20g
- Parmigiano 30g', 'Accompagnare noci con cubetti di formaggio stagionato.', 547, 'keto', 2),
  ('cib-keto-spuntino-prosciutto-crudo-con-mozzarelline-249', 'spuntino', 'Prosciutto crudo con mozzarelline', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 80%.', 194, 17, 0, 14, '- Prosciutto crudo 30g
- Mozzarelline 50g', 'Avvolgere mozzarelline con fette di prosciutto crudo.', 548, 'keto', 3),
  ('cib-keto-spuntino-sedano-con-crema-di-formaggio-250', 'spuntino', 'Sedano con crema di formaggio', 'Piano: Cheto. Tempo: 3 min. Porzione donna ≈ 85%.', 156, 4, 4, 14, '- Sedano 100g
- Formaggio cremoso 40g', 'Farcire i gambi di sedano con formaggio cremoso.', 549, 'keto', 3),
  ('cib-keto-spuntino-sedano-con-crema-di-formaggio-251', 'spuntino', 'Sedano con crema di formaggio', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 87, 3, 3, 7, '- Sedano 80g
- Crema di formaggio 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 550, 'keto', 5),
  ('cib-keto-spuntino-uova-di-quaglia-con-mayo-252', 'spuntino', 'Uova di quaglia con mayo', 'Piano: Cheto. Tempo: 5 min. Porzione donna ≈ 80%.', 164, 8, 1, 14, '- Uova di quaglia 60g
- Maionese 10g', 'Lessare le uova 3 min, sbucciare, servire con maionese.', 551, 'keto', 5),
  ('cib-keto-spuntino-uovo-sodo-con-maionese-253', 'spuntino', 'Uovo sodo con maionese', 'Piano: Cheto. Tempo: 10 min. Porzione donna ≈ 80%.', 154, 8, 0, 13, '- Uova 60g
- Maionese 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 552, 'keto', 10),
  ('cib-keto-spuntino-uovo-sodo-con-olive-254', 'spuntino', 'Uovo sodo con olive', 'Piano: Cheto. Tempo: 12 min. Porzione donna ≈ 80%.', 201, 15, 2, 15, '- Uova sode 120g
- Olive nere 20g', 'Servire uova sode con olive nere.', 553, 'keto', 12),
  ('cib-massa-cena-arista-di-maiale-con-pure-255', 'cena', 'Arista di maiale con purè', 'Piano: Massa. Tempo: 35 min. Porzione donna ≈ 80%.', 502, 39, 20, 29, '- Arista di maiale 180g
- Purè di patate 150g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 554, 'massa', 35),
  ('cib-massa-cena-bistecca-con-patate-al-forno-256', 'cena', 'Bistecca con patate al forno', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 80%.', 626, 44, 32, 34, '- Bistecca di manzo 200g
- Patate 200g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 555, 'massa', 30),
  ('cib-massa-cena-bistecca-con-riso-e-verdure-257', 'cena', 'Bistecca con riso e verdure', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 821, 50, 81, 31, '- Bistecca manzo 200g
- Riso basmati 100g
- Broccoli 120g
- Olio extravergine 10g', 'Grigliare la bistecca, cuocere riso e saltare verdure.', 556, 'massa', 20),
  ('cib-massa-cena-bowl-di-riso-e-salmone-teriyaki-258', 'cena', 'Bowl di riso e salmone teriyaki', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 735, 41, 83, 24, '- Riso basmati 90g
- Salmone 140g
- Salsa di soia 15g
- Miele 10g
- Edamame 40g
- Avocado 40g', 'Cuocere riso, glassare salmone con soia e miele, comporre bowl con edamame e avocado.', 557, 'massa', 20),
  ('cib-massa-cena-burger-di-manzo-con-pane-e-patatine-259', 'cena', 'Burger di manzo con pane e patatine', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 711, 33, 64, 35, '- Hamburger di manzo 150g
- Pane per burger 70g
- Lattuga 20g
- Pomodoro 30g
- Patate fritte 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 558, 'massa', 20),
  ('cib-massa-cena-cotoletta-alla-milanese-con-insalata-260', 'cena', 'Cotoletta alla milanese con insalata', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 407, 26, 15, 27, '- Cotoletta di vitello 150g
- Insalata mista 100g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 559, 'massa', 20),
  ('cib-massa-cena-filetto-di-maiale-con-riso-261', 'cena', 'Filetto di maiale con riso', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 622, 45, 68, 18, '- Filetto di maiale 180g
- Riso basmati 80g
- Verdure miste 100g
- Olio EVO 10g', 'Cuocere il filetto in padella, servire con riso e verdure saltate.', 560, 'massa', 20),
  ('cib-massa-cena-lasagna-di-carne-262', 'cena', 'Lasagna di carne', 'Piano: Massa. Tempo: 40 min. Porzione donna ≈ 70%.', 616, 33, 63, 25, '- Sfoglia per lasagna 80g
- Ragù di carne 150g
- Besciamella 60g
- Parmigiano 20g', 'Alternare strati di sfoglia, ragù, besciamella e parmigiano. Forno 180° per 30 min.', 561, 'massa', 40),
  ('cib-massa-cena-merluzzo-impanato-con-riso-263', 'cena', 'Merluzzo impanato con riso', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 70%.', 675, 45, 81, 18, '- Merluzzo 180g
- Pangrattato 25g
- Uovo 30g
- Riso 80g
- Olio EVO 12g', 'Passare il merluzzo nell''uovo e pangrattato, cuocere in forno. Servire con riso.', 562, 'massa', 25),
  ('cib-massa-cena-pasta-al-forno-gratinata-264', 'cena', 'Pasta al forno gratinata', 'Piano: Massa. Tempo: 60 min. Porzione donna ≈ 80%.', 475, 20, 52, 22, '- Pasta al forno 250g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 563, 'massa', 60),
  ('cib-massa-cena-pasta-con-petto-di-pollo-e-pesto-265', 'cena', 'Pasta con petto di pollo e pesto', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 613, 49, 71, 13, '- Pasta di semola 100g
- Petto di pollo 150g
- Pesto 20g', 'Cuocere la pasta, grigliare pollo a dadini, condire con pesto.', 564, 'massa', 15),
  ('cib-massa-cena-pasta-con-tonno-e-pomodorini-266', 'cena', 'Pasta con tonno e pomodorini', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 591, 38, 74, 16, '- Penne 100g
- Tonno al naturale 100g
- Pomodorini 80g
- Olive 15g
- Olio EVO 10g', 'Saltare pomodorini con olio, aggiungere tonno sgocciolato e olive. Condire la pasta.', 565, 'massa', 15),
  ('cib-massa-cena-pesce-fritto-con-verdure-267', 'cena', 'Pesce fritto con verdure', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 365, 21, 23, 21, '- Calamari fritti 100g
- Gamberi fritti 80g
- Verdure 80g
- Limone 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 566, 'massa', 20),
  ('cib-massa-cena-petto-di-pollo-alla-parmigiana-268', 'cena', 'Petto di pollo alla parmigiana', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 521, 61, 29, 16, '- Petto di pollo 180g
- Passata 80g
- Mozzarella 50g
- Parmigiano 15g
- Pane 50g', 'Grigliare pollo, coprire con passata, mozzarella e parmigiano. Gratinare in forno. Pane a parte.', 567, 'massa', 20),
  ('cib-massa-cena-petto-di-pollo-farcito-269', 'cena', 'Petto di pollo farcito', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 410, 50, 2, 21, '- Petto di pollo 180g
- Prosciutto cotto 30g
- Formaggio filante 30g
- Spinaci 50g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 568, 'massa', 25),
  ('cib-massa-cena-pizza-proteica-270', 'cena', 'Pizza proteica', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 807, 39, 104, 24, '- Impasto pizza 200g
- Mozzarella 80g
- Prosciutto cotto 40g
- Passata 60g', 'Stendere impasto, condire con passata e mozzarella, aggiungere prosciutto. Forno 250° per 10 min.', 569, 'massa', 15),
  ('cib-massa-cena-pollo-al-curry-con-riso-basmati-271', 'cena', 'Pollo al curry con riso basmati', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 523, 43, 62, 10, '- Petto di pollo 180g
- Riso basmati 80g
- Latte di cocco 50g
- Curry 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 570, 'massa', 25),
  ('cib-massa-cena-pollo-arrosto-con-patate-272', 'cena', 'Pollo arrosto con patate', 'Piano: Massa. Tempo: 50 min. Porzione donna ≈ 70%.', 528, 40, 39, 23, '- Coscia di pollo 200g
- Patate 200g
- Rosmarino 3g
- Olio EVO 12g', 'Cuocere pollo e patate in forno a 200° con rosmarino e olio per 40 min.', 571, 'massa', 50),
  ('cib-massa-cena-pollo-intero-al-forno-con-contorno-273', 'cena', 'Pollo intero al forno con contorno', 'Piano: Massa. Tempo: 45 min. Porzione donna ≈ 80%.', 562, 32, 31, 32, '- Coscia di pollo 200g
- Patate 150g
- Carote 80g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 572, 'massa', 45),
  ('cib-massa-cena-polpettone-con-contorno-274', 'cena', 'Polpettone con contorno', 'Piano: Massa. Tempo: 45 min. Porzione donna ≈ 80%.', 504, 28, 34, 28, '- Polpettone di carne 180g
- Patate lesse 150g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 573, 'massa', 45),
  ('cib-massa-cena-polpettone-con-pure-275', 'cena', 'Polpettone con purè', 'Piano: Massa. Tempo: 50 min. Porzione donna ≈ 70%.', 724, 41, 54, 38, '- Macinato misto 180g
- Pangrattato 20g
- Uovo 50g
- Patate 200g
- Latte 40g
- Burro 10g', 'Impastare macinato con pangrattato e uovo, cuocere in forno. Preparare purè con patate, latte e burro.', 574, 'massa', 50),
  ('cib-massa-cena-riso-con-uova-e-verdure-saltate-276', 'cena', 'Riso con uova e verdure saltate', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 734, 27, 104, 21, '- Riso basmati 120g
- Uova 120g
- Piselli 60g
- Carote 50g
- Olio 8g', 'Saltare riso cotto con uova, carote e piselli in padella con olio di sesamo.', 575, 'massa', 15),
  ('cib-massa-cena-salmone-con-patate-dolci-277', 'cena', 'Salmone con patate dolci', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 75%.', 593, 39, 40, 30, '- Filetto di salmone 180g
- Patate dolci 200g
- Olio extravergine 10g', 'Infornare salmone e patate dolci con olio e rosmarino.', 576, 'massa', 30),
  ('cib-massa-cena-salmone-con-riso-e-broccoli-278', 'cena', 'Salmone con riso e broccoli', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 624, 38, 57, 26, '- Salmone 150g
- Riso 70g
- Broccoli 120g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 577, 'massa', 25),
  ('cib-massa-cena-salsicce-con-peperoni-279', 'cena', 'Salsicce con peperoni', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 590, 23, 32, 40, '- Salsiccia 120g
- Peperoni 150g
- Pane 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 578, 'massa', 25),
  ('cib-massa-cena-spezzatino-con-polenta-280', 'cena', 'Spezzatino con polenta', 'Piano: Massa. Tempo: 60 min. Porzione donna ≈ 80%.', 477, 38, 28, 23, '- Manzo per stufato 180g
- Polenta 150g
- Carote 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 579, 'massa', 60),
  ('cib-massa-cena-straccetti-di-manzo-con-rucola-281', 'cena', 'Straccetti di manzo con rucola', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 80%.', 432, 40, 4, 27, '- Manzo a straccetti 160g
- Rucola 60g
- Pomodorini 80g
- Parmigiano 15g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 580, 'massa', 15),
  ('cib-massa-cena-stufato-di-manzo-con-verdure-282', 'cena', 'Stufato di manzo con verdure', 'Piano: Massa. Tempo: 100 min. Porzione donna ≈ 70%.', 510, 43, 38, 21, '- Manzo per stufato 180g
- Patate 120g
- Carota 60g
- Piselli 50g
- Passata 80g
- Olio EVO 8g', 'Rosolare il manzo, aggiungere verdure e passata. Cuocere coperto a fuoco basso per 1.5h.', 581, 'massa', 100),
  ('cib-massa-cena-tacos-di-pollo-con-guacamole-283', 'cena', 'Tacos di pollo con guacamole', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 653, 54, 59, 22, '- Tortillas 120g
- Petto di pollo 180g
- Avocado 60g
- Pomodoro 60g', 'Grigliare pollo speziato, farcire tortillas con lattuga, pomodoro e guacamole.', 582, 'massa', 20),
  ('cib-massa-colazione-acai-bowl-con-granola-284', 'colazione', 'Açaí bowl con granola', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 80%.', 348, 6, 54, 12, '- Polpa di açaí 100g
- Banana 80g
- Granola 40g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 583, 'massa', 10),
  ('cib-massa-colazione-bowl-di-ricotta-con-granola-285', 'colazione', 'Bowl di ricotta con granola', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 70%.', 469, 17, 51, 22, '- Ricotta 150g
- Granola 40g
- Miele 15g
- Frutti di bosco 50g', 'Mettere ricotta nella bowl, aggiungere granola, frutti di bosco e miele.', 584, 'massa', 5),
  ('cib-massa-colazione-french-toast-proteico-286', 'colazione', 'French toast proteico', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 70%.', 513, 22, 57, 23, '- Pan carré 80g
- Uova 100g
- Latte 50g
- Cannella 2g
- Miele 15g
- Burro 8g', 'Intingere le fette nel mix di uova, latte e cannella. Cuocere nel burro. Servire con miele.', 585, 'massa', 10),
  ('cib-massa-colazione-french-toast-proteico-287', 'colazione', 'French toast proteico', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 80%.', 376, 16, 53, 12, '- Pane in cassetta 80g
- Uova 60g
- Latte 50g
- Miele 15g
- Cannella 2g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 586, 'massa', 15),
  ('cib-massa-colazione-frullato-avena-banana-e-proteine-288', 'colazione', 'Frullato avena banana e proteine', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 70%.', 574, 40, 73, 14, '- Latte intero 250g
- Fiocchi d''avena 50g
- Banana 120g
- Proteine in polvere 30g', 'Frullare tutti gli ingredienti insieme.', 587, 'massa', 5),
  ('cib-massa-colazione-latte-con-cereali-e-frutta-secca-289', 'colazione', 'Latte con cereali e frutta secca', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 70%.', 577, 21, 68, 25, '- Latte intero 300g
- Cereali integrali 60g
- Mandorle 20g
- Uvetta 15g', 'Versare latte sui cereali, aggiungere mandorle e uvetta.', 588, 'massa', 3),
  ('cib-massa-colazione-muesli-con-yogurt-greco-e-semi-290', 'colazione', 'Muesli con yogurt greco e semi', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 396, 23, 50, 11, '- Müsli 60g
- Yogurt greco 150g
- Semi misti 10g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 589, 'massa', 5),
  ('cib-massa-colazione-omelette-con-pane-e-marmellata-291', 'colazione', 'Omelette con pane e marmellata', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 80%.', 375, 20, 43, 14, '- Uova 120g
- Pane integrale 60g
- Marmellata 25g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 590, 'massa', 10),
  ('cib-massa-colazione-pancake-proteici-292', 'colazione', 'Pancake proteici', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 532, 36, 65, 15, '- Farina d''avena 50g
- Uova 100g
- Banana 80g
- Proteine in polvere 20g
- Miele 15g', 'Frullare tutti gli ingredienti, cuocere come pancake in padella antiaderente. Servire con miele.', 591, 'massa', 15),
  ('cib-massa-colazione-pancake-proteici-con-burro-d-arachidi-293', 'colazione', 'Pancake proteici con burro d''arachidi', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 608, 46, 47, 26, '- Farina integrale 60g
- Uova 120g
- Latte 100g
- Proteine whey 20g
- Burro d''arachidi 20g', 'Mescolare farina, uova, latte e proteine. Cuocere in padella. Servire con burro d''arachidi.', 592, 'massa', 15),
  ('cib-massa-colazione-pane-con-prosciutto-e-formaggio-294', 'colazione', 'Pane con prosciutto e formaggio', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 70%.', 446, 27, 52, 14, '- Pane casereccio 100g
- Prosciutto cotto 50g
- Emmental 30g
- Pomodoro 40g', 'Farcire il pane con prosciutto, formaggio e pomodoro. Scaldare se desiderato.', 593, 'massa', 5),
  ('cib-massa-colazione-pane-con-uova-e-prosciutto-295', 'colazione', 'Pane con uova e prosciutto', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 80%.', 404, 28, 37, 16, '- Pane integrale 80g
- Uova 120g
- Prosciutto cotto 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 594, 'massa', 10),
  ('cib-massa-colazione-porridge-proteico-con-banana-e-noci-296', 'colazione', 'Porridge proteico con banana e noci', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 80%.', 652, 20, 85, 25, '- Fiocchi d''avena 70g
- Latte intero 200g
- Banana 100g
- Noci 20g
- Miele 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 595, 'massa', 10),
  ('cib-massa-colazione-porridge-proteico-con-banana-e-proteine-297', 'colazione', 'Porridge proteico con banana e proteine', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 70%.', 651, 42, 85, 14, '- Fiocchi d''avena 80g
- Latte intero 200g
- Proteine whey 30g
- Banana 120g', 'Cuocere avena con latte, aggiungere proteine in polvere e banana.', 596, 'massa', 10),
  ('cib-massa-colazione-ricotta-con-miele-e-noci-298', 'colazione', 'Ricotta con miele e noci', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 500, 18, 40, 29, '- Ricotta 150g
- Miele 20g
- Noci 20g
- Pane integrale 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 597, 'massa', 5),
  ('cib-massa-colazione-smoothie-massa-con-avena-299', 'colazione', 'Smoothie massa con avena', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 532, 19, 63, 22, '- Latte intero 250g
- Banana 120g
- Fiocchi d''avena 40g
- Burro d''arachidi 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 598, 'massa', 5),
  ('cib-massa-colazione-toast-con-uova-e-avocado-300', 'colazione', 'Toast con uova e avocado', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 70%.', 433, 22, 36, 22, '- Pane integrale 80g
- Uova 100g
- Avocado 60g
- Pomodoro 50g', 'Tostare il pane, cuocere le uova strapazzate, aggiungere avocado a fette e pomodoro.', 599, 'massa', 10),
  ('cib-massa-colazione-uova-strapazzate-con-pane-e-prosciutto-301', 'colazione', 'Uova strapazzate con pane e prosciutto', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 70%.', 511, 38, 38, 23, '- Uova intere 180g
- Pane integrale 80g
- Prosciutto cotto 50g', 'Strapazzare le uova, tostare il pane, servire con prosciutto cotto.', 600, 'massa', 10),
  ('cib-massa-pranzo-bowl-di-quinoa-e-pollo-302', 'pranzo', 'Bowl di quinoa e pollo', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 611, 47, 55, 22, '- Quinoa 80g
- Petto di pollo 150g
- Avocado 50g
- Pomodorini 60g
- Olio EVO 8g', 'Cuocere quinoa e pollo separatamente, comporre la bowl con avocado e pomodorini.', 601, 'massa', 20),
  ('cib-massa-pranzo-cous-cous-con-pollo-e-ceci-303', 'pranzo', 'Cous cous con pollo e ceci', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 589, 40, 75, 14, '- Couscous 80g
- Pollo 120g
- Ceci 60g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 602, 'massa', 25),
  ('cib-massa-pranzo-farro-con-salmone-e-avocado-304', 'pranzo', 'Farro con salmone e avocado', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 621, 35, 58, 28, '- Farro 80g
- Salmone 120g
- Avocado 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 603, 'massa', 20),
  ('cib-massa-pranzo-focaccia-farcita-con-mortadella-305', 'pranzo', 'Focaccia farcita con mortadella', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 502, 18, 36, 32, '- Focaccia 100g
- Mortadella 50g
- Mozzarella 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 604, 'massa', 5),
  ('cib-massa-pranzo-gnocchi-con-ragu-306', 'pranzo', 'Gnocchi con ragù', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 70%.', 712, 34, 89, 23, '- Gnocchi di patate 250g
- Macinato di manzo 100g
- Passata 100g
- Carota 20g
- Olio EVO 8g
- Parmigiano 15g', 'Preparare il ragù con macinato, passata e carota. Cuocere gnocchi, condire con ragù e parmigiano.', 605, 'massa', 30),
  ('cib-massa-pranzo-hamburger-con-patate-307', 'pranzo', 'Hamburger con patate', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 70%.', 648, 39, 67, 26, '- Macinato di manzo 150g
- Panino hamburger 70g
- Patate 150g
- Ketchup 15g
- Olio EVO 10g', 'Formare hamburger, cuocere alla griglia. Patate al forno a spicchi con olio.', 606, 'massa', 25),
  ('cib-massa-pranzo-insalata-proteica-con-uova-308', 'pranzo', 'Insalata proteica con uova', 'Piano: Massa. Tempo: 10 min. Porzione donna ≈ 70%.', 609, 46, 47, 25, '- Uova sode 100g
- Tonno al naturale 80g
- Fagioli cannellini 100g
- Mais 40g
- Insalata mista 60g
- Olio EVO 12g
- Pane 50g', 'Tagliare uova sode a spicchi, comporre l''insalata con tutti gli ingredienti.', 607, 'massa', 10),
  ('cib-massa-pranzo-panino-con-bresaola-e-mozzarella-309', 'pranzo', 'Panino con bresaola e mozzarella', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 467, 37, 46, 15, '- Panino integrale 100g
- Bresaola 60g
- Mozzarella 50g
- Rucola 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 608, 'massa', 5),
  ('cib-massa-pranzo-pasta-al-salmone-310', 'pranzo', 'Pasta al salmone', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 597, 33, 71, 18, '- Fusilli 100g
- Salmone fresco 100g
- Panna leggera 30g
- Aneto 2g', 'Saltare il salmone a cubetti, aggiungere panna, condire la pasta.', 609, 'massa', 15),
  ('cib-massa-pranzo-pasta-al-tonno-con-olive-311', 'pranzo', 'Pasta al tonno con olive', 'Piano: Massa. Tempo: 12 min. Porzione donna ≈ 70%.', 672, 44, 85, 17, '- Pasta di semola 120g
- Tonno al naturale 120g
- Olive nere 20g
- Olio extravergine 10g', 'Cuocere la pasta, condire con tonno, olive, capperi e olio.', 610, 'massa', 12),
  ('cib-massa-pranzo-pasta-al-tonno-con-olive-312', 'pranzo', 'Pasta al tonno con olive', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 80%.', 579, 37, 70, 15, '- Pasta 100g
- Tonno al naturale 100g
- Olive 15g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 611, 'massa', 15),
  ('cib-massa-pranzo-pasta-alla-carbonara-313', 'pranzo', 'Pasta alla carbonara', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 738, 29, 70, 37, '- Spaghetti 100g
- Guanciale 30g
- Uova 60g
- Pecorino 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 612, 'massa', 20),
  ('cib-massa-pranzo-pasta-carbonara-314', 'pranzo', 'Pasta carbonara', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 733, 34, 72, 35, '- Spaghetti 100g
- Guanciale 40g
- Uova 75g
- Pecorino 25g
- Pepe nero 1g', 'Rosolare guanciale, cuocere pasta, mantecare fuori dal fuoco con uova e pecorino.', 613, 'massa', 15),
  ('cib-massa-pranzo-pasta-con-ragu-di-carne-315', 'pranzo', 'Pasta con ragù di carne', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 80%.', 544, 29, 73, 14, '- Pasta di semola 100g
- Ragù di carne 100g
- Parmigiano 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 614, 'massa', 30),
  ('cib-massa-pranzo-pasta-con-ragu-di-tacchino-316', 'pranzo', 'Pasta con ragù di tacchino', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 70%.', 761, 53, 88, 21, '- Pasta di semola 120g
- Tacchino macinato 150g
- Passata di pomodoro 100g
- Olio extravergine 10g
- Parmigiano 15g', 'Cuocere la pasta, preparare il ragu con tacchino macinato e pomodoro.', 615, 'massa', 25),
  ('cib-massa-pranzo-pasta-con-salsiccia-e-broccoli-317', 'pranzo', 'Pasta con salsiccia e broccoli', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 715, 28, 76, 33, '- Orecchiette 100g
- Salsiccia 80g
- Broccoli 100g
- Olio EVO 8g', 'Sbricciolare salsiccia, rosolare, aggiungere broccoli lessati, condire la pasta.', 616, 'massa', 15),
  ('cib-massa-pranzo-pasta-con-salsiccia-e-broccoli-318', 'pranzo', 'Pasta con salsiccia e broccoli', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 624, 24, 75, 24, '- Pasta 100g
- Salsiccia 60g
- Broccoli 100g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 617, 'massa', 20),
  ('cib-massa-pranzo-pasta-e-ceci-319', 'pranzo', 'Pasta e ceci', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 80%.', 465, 16, 67, 14, '- Pasta mista 60g
- Ceci 100g
- Rosmarino 2g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 618, 'massa', 30),
  ('cib-massa-pranzo-petto-di-pollo-con-riso-e-broccoli-320', 'pranzo', 'Petto di pollo con riso e broccoli', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 679, 52, 81, 14, '- Petto di pollo 180g
- Riso basmati 100g
- Broccoli 120g
- Olio extravergine 10g', 'Grigliare il pollo, cuocere riso e broccoli al vapore.', 619, 'massa', 20),
  ('cib-massa-pranzo-piadina-con-prosciutto-e-squacquerone-321', 'pranzo', 'Piadina con prosciutto e squacquerone', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 506, 24, 47, 25, '- Piadina 100g
- Prosciutto crudo 50g
- Squacquerone 40g
- Rucola 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 620, 'massa', 5),
  ('cib-massa-pranzo-polenta-con-ragu-322', 'pranzo', 'Polenta con ragù', 'Piano: Massa. Tempo: 30 min. Porzione donna ≈ 80%.', 355, 22, 34, 15, '- Polenta 200g
- Ragù di carne 120g
- Parmigiano 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 621, 'massa', 30),
  ('cib-massa-pranzo-pollo-con-patate-al-forno-323', 'pranzo', 'Pollo con patate al forno', 'Piano: Massa. Tempo: 40 min. Porzione donna ≈ 75%.', 498, 34, 34, 25, '- Coscia di pollo 200g
- Patate 200g
- Olio extravergine 10g', 'Infornare pollo e patate con rosmarino e olio a 200C per 30 min.', 622, 'massa', 40),
  ('cib-massa-pranzo-riso-con-gamberoni-e-zucchine-324', 'pranzo', 'Riso con gamberoni e zucchine', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 537, 37, 68, 13, '- Riso 90g
- Gamberoni 150g
- Zucchine 100g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 623, 'massa', 25),
  ('cib-massa-pranzo-riso-con-manzo-e-verdure-325', 'pranzo', 'Riso con manzo e verdure', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 70%.', 589, 32, 77, 17, '- Riso basmati 90g
- Manzo macinato magro 120g
- Zucchine 80g
- Carota 50g
- Olio EVO 10g', 'Cuocere il riso, saltare il manzo con verdure in padella, unire tutto.', 624, 'massa', 20),
  ('cib-massa-pranzo-riso-con-pollo-e-verdure-326', 'pranzo', 'Riso con pollo e verdure', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 80%.', 577, 39, 70, 15, '- Riso 90g
- Petto di pollo 150g
- Verdure miste 100g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 625, 'massa', 25),
  ('cib-massa-pranzo-riso-con-tonno-e-verdure-327', 'pranzo', 'Riso con tonno e verdure', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 656, 48, 85, 13, '- Riso basmati 100g
- Tonno al naturale 160g
- Mais 50g
- Olio extravergine 10g', 'Cuocere il riso, condire con tonno, mais, verdure e olio.', 626, 'massa', 15),
  ('cib-massa-pranzo-risotto-con-gamberetti-328', 'pranzo', 'Risotto con gamberetti', 'Piano: Massa. Tempo: 25 min. Porzione donna ≈ 70%.', 518, 29, 73, 10, '- Riso carnaroli 90g
- Gamberetti sgusciati 120g
- Zucchine 60g
- Burro 10g
- Vino bianco 20g', 'Tostare riso, sfumare con vino, aggiungere brodo e zucchine. A fine cottura mantecare con gamberetti e burro.', 627, 'massa', 25),
  ('cib-massa-pranzo-tagliatelle-ai-funghi-329', 'pranzo', 'Tagliatelle ai funghi', 'Piano: Massa. Tempo: 20 min. Porzione donna ≈ 80%.', 515, 22, 70, 15, '- Tagliatelle all''uovo 100g
- Funghi misti 120g
- Panna 20g
- Parmigiano 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 628, 'massa', 20),
  ('cib-massa-pranzo-wrap-gigante-con-pollo-330', 'pranzo', 'Wrap gigante con pollo', 'Piano: Massa. Tempo: 15 min. Porzione donna ≈ 70%.', 514, 42, 42, 21, '- Tortilla grande 80g
- Petto di pollo 150g
- Lattuga 30g
- Pomodoro 50g
- Maionese 15g', 'Grigliare il pollo, affettare, farcire la tortilla con tutti gli ingredienti e arrotolare.', 629, 'massa', 15),
  ('cib-massa-spuntino-banana-con-burro-d-arachidi-331', 'spuntino', 'Banana con burro d''arachidi', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 70%.', 225, 6, 28, 10, '- Banana 120g
- Burro di arachidi 20g', 'Spalmare burro di arachidi su fette di banana.', 630, 'massa', 3),
  ('cib-massa-spuntino-barretta-ai-cereali-e-cioccolato-332', 'spuntino', 'Barretta ai cereali e cioccolato', 'Piano: Massa. Porzione donna ≈ 80%.', 150, 3, 22, 6, '- Barretta ai cereali 35g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 631, 'massa', 0),
  ('cib-massa-spuntino-barretta-proteica-fatta-in-casa-333', 'spuntino', 'Barretta proteica fatta in casa', 'Piano: Massa. Tempo: 1 min. Porzione donna ≈ 80%.', 240, 20, 22, 8, '- Barretta proteica 60g', 'Barretta proteica confezionata ricca di proteine.', 632, 'massa', 1),
  ('cib-massa-spuntino-budino-proteico-334', 'spuntino', 'Budino proteico', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 70%.', 258, 32, 13, 9, '- Latte 200g
- Proteine in polvere 30g
- Cacao amaro 5g', 'Scaldare latte, sciogliere proteine e cacao, versare in coppetta e lasciare in frigo 1h.', 633, 'massa', 5),
  ('cib-massa-spuntino-frullato-di-banana-e-latte-335', 'spuntino', 'Frullato di banana e latte', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 235, 7, 34, 7, '- Banana 120g
- Latte intero 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 634, 'massa', 5),
  ('cib-massa-spuntino-gallette-con-burro-d-arachidi-e-banana-336', 'spuntino', 'Gallette con burro d''arachidi e banana', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 75%.', 332, 10, 44, 13, '- Gallette di riso 30g
- Burro d''arachidi 25g
- Banana 80g', 'Spalmare burro d''arachidi sulle gallette, aggiungere banana a rondelle.', 635, 'massa', 3),
  ('cib-massa-spuntino-mix-di-frutta-secca-energetico-337', 'spuntino', 'Mix di frutta secca energetico', 'Piano: Massa. Porzione donna ≈ 80%.', 218, 6, 18, 15, '- Mandorle 15g
- Anacardi 15g
- Uvetta 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 636, 'massa', 0),
  ('cib-massa-spuntino-muffin-proteico-338', 'spuntino', 'Muffin proteico', 'Piano: Massa. Porzione donna ≈ 80%.', 180, 12, 18, 7, '- Muffin proteico 60g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 637, 'massa', 0),
  ('cib-massa-spuntino-pane-con-nutella-339', 'spuntino', 'Pane con Nutella', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 215, 4, 32, 8, '- Pane 40g
- Crema di nocciole 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 638, 'massa', 5),
  ('cib-massa-spuntino-pane-con-prosciutto-e-formaggio-340', 'spuntino', 'Pane con prosciutto e formaggio', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 75%.', 300, 21, 26, 13, '- Pane integrale 60g
- Prosciutto crudo 40g
- Emmental 20g', 'Farcire il panino con prosciutto e formaggio.', 639, 'massa', 3),
  ('cib-massa-spuntino-pane-con-prosciutto-e-formaggio-341', 'spuntino', 'Pane con prosciutto e formaggio', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 248, 14, 26, 9, '- Pane 50g
- Prosciutto cotto 30g
- Formaggio 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 640, 'massa', 5),
  ('cib-massa-spuntino-panino-con-tonno-342', 'spuntino', 'Panino con tonno', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 70%.', 279, 21, 25, 10, '- Panino integrale 60g
- Tonno al naturale 60g
- Maionese 10g
- Pomodoro 30g', 'Farcire il panino con tonno, maionese e pomodoro.', 641, 'massa', 5),
  ('cib-massa-spuntino-ricotta-con-miele-e-noci-343', 'spuntino', 'Ricotta con miele e noci', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 70%.', 321, 13, 18, 22, '- Ricotta 120g
- Miele 15g
- Noci 15g', 'Servire ricotta con miele e noci spezzate sopra.', 642, 'massa', 3),
  ('cib-massa-spuntino-shake-proteico-con-banana-e-latte-344', 'spuntino', 'Shake proteico con banana e latte', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 75%.', 337, 31, 33, 8, '- Proteine whey 30g
- Banana 100g
- Latte intero 200g', 'Frullare proteine con banana e latte.', 643, 'massa', 3),
  ('cib-massa-spuntino-toast-con-burro-d-arachidi-345', 'spuntino', 'Toast con burro d''arachidi', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 221, 8, 22, 12, '- Pane in cassetta 40g
- Burro d''arachidi 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 644, 'massa', 5),
  ('cib-massa-spuntino-trail-mix-energetico-346', 'spuntino', 'Trail mix energetico', 'Piano: Massa. Tempo: 2 min. Porzione donna ≈ 70%.', 277, 6, 19, 20, '- Mandorle 15g
- Noci 10g
- Uvetta 15g
- Cioccolato fondente 15g', 'Mescolare tutti gli ingredienti in una ciotola.', 645, 'massa', 2),
  ('cib-massa-spuntino-yogurt-greco-con-miele-e-banana-347', 'spuntino', 'Yogurt greco con miele e banana', 'Piano: Massa. Tempo: 5 min. Porzione donna ≈ 80%.', 206, 16, 33, 0, '- Yogurt greco 150g
- Miele 15g
- Banana 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 646, 'massa', 5),
  ('cib-massa-spuntino-yogurt-greco-con-miele-e-frutta-secca-348', 'spuntino', 'Yogurt greco con miele e frutta secca', 'Piano: Massa. Tempo: 3 min. Porzione donna ≈ 75%.', 355, 16, 22, 22, '- Yogurt greco intero 200g
- Miele 15g
- Noci e mandorle 20g', 'Mescolare yogurt con miele, noci e mandorle.', 647, 'massa', 3),
  ('cib-mediterranea-cena-baccala-alla-vicentina-349', 'cena', 'Baccalà alla vicentina', 'Piano: Mediterranea. Tempo: 40 min. Porzione donna ≈ 80%.', 309, 39, 10, 13, '- Baccalà 180g
- Latte 100g
- Cipolla 50g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 648, 'mediterranea', 40),
  ('cib-mediterranea-cena-branzino-al-forno-con-patate-350', 'cena', 'Branzino al forno con patate', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 365, 35, 24, 13, '- Branzino 180g
- Patate 150g
- Olio EVO 8g
- Rosmarino 2g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 649, 'mediterranea', 35),
  ('cib-mediterranea-cena-bresaola-con-rucola-e-grana-351', 'cena', 'Bresaola con rucola e grana', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 399, 38, 20, 18, '- Bresaola 80g
- Rucola 60g
- Grana Padano 25g
- Olio extravergine 8g
- Pane 40g', 'Disporre la bresaola nel piatto, aggiungere rucola, scaglie di grana e olio.', 650, 'mediterranea', 5),
  ('cib-mediterranea-cena-calamari-ripieni-al-forno-352', 'cena', 'Calamari ripieni al forno', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 293, 32, 16, 11, '- Calamari 180g
- Pangrattato 20g
- Prezzemolo 5g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 651, 'mediterranea', 35),
  ('cib-mediterranea-cena-caponata-con-crostini-353', 'cena', 'Caponata con crostini', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 444, 11, 56, 19, '- Melanzane 150g
- Pomodori pelati 100g
- Sedano 30g
- Cipolla 40g
- Olive verdi 20g
- Capperi 10g
- Olio EVO 15g
- Pane casereccio 80g', 'Friggere le melanzane a cubetti, aggiungere sedano, cipolla, pomodoro, olive e capperi. Servire con crostini.', 652, 'mediterranea', 30),
  ('cib-mediterranea-cena-caprese-con-pane-354', 'cena', 'Caprese con pane', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 549, 23, 31, 35, '- Mozzarella di bufala 125g
- Pomodori 150g
- Basilico 5g
- Olio EVO 8g
- Pane integrale 60g', 'Tagliare mozzarella e pomodori a fette, alternare, condire con basilico e olio. Servire con pane.', 653, 'mediterranea', 5),
  ('cib-mediterranea-cena-coniglio-al-forno-con-patate-355', 'cena', 'Coniglio al forno con patate', 'Piano: Mediterranea. Tempo: 45 min. Porzione donna ≈ 80%.', 373, 32, 19, 17, '- Coniglio 150g
- Patate 120g
- Rosmarino 3g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 654, 'mediterranea', 45),
  ('cib-mediterranea-cena-cozze-alla-marinara-con-pane-356', 'cena', 'Cozze alla marinara con pane', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 394, 32, 35, 11, '- Cozze 300g
- Pomodoro 100g
- Pane 50g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 655, 'mediterranea', 25),
  ('cib-mediterranea-cena-crostata-salata-ricotta-e-spinaci-357', 'cena', 'Crostata salata ricotta e spinaci', 'Piano: Mediterranea. Tempo: 40 min. Porzione donna ≈ 80%.', 620, 28, 39, 39, '- Pasta brisée 80g
- Ricotta 100g
- Spinaci 100g
- Uovo 50g
- Parmigiano 15g', 'Stendere la brisée, farcire con ricotta, spinaci saltati, uovo e parmigiano. Cuocere a 180° per 30 min.', 656, 'mediterranea', 40),
  ('cib-mediterranea-cena-fesa-di-tacchino-con-funghi-358', 'cena', 'Fesa di tacchino con funghi', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 268, 38, 3, 10, '- Fesa di tacchino 150g
- Funghi champignon 120g
- Olio EVO 8g
- Insalata mista 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 657, 'mediterranea', 20),
  ('cib-mediterranea-cena-frittata-di-cipolle-con-pane-359', 'cena', 'Frittata di cipolle con pane', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 350, 19, 28, 18, '- Uova 120g
- Cipolle 100g
- Pane integrale 40g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 658, 'mediterranea', 20),
  ('cib-mediterranea-cena-frittata-di-verdure-360', 'cena', 'Frittata di verdure', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 458, 27, 25, 27, '- Uova 180g
- Zucchine 100g
- Peperoni 60g
- Olio extravergine 8g
- Pane integrale 40g', 'Sbattere uova con verdure tagliate a dadini. Cuocere in padella con coperchio.', 659, 'mediterranea', 15),
  ('cib-mediterranea-cena-hamburger-di-tacchino-361', 'cena', 'Hamburger di tacchino', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 451, 37, 38, 17, '- Macinato di tacchino 150g
- Pangrattato 15g
- Insalata mista 80g
- Pomodoro 50g
- Pane integrale 60g
- Olio EVO 8g', 'Impastare macinato con pangrattato, formare hamburger, cuocere in padella. Servire nel pane con insalata.', 660, 'mediterranea', 15),
  ('cib-mediterranea-cena-involtini-di-melanzane-con-ricotta-362', 'cena', 'Involtini di melanzane con ricotta', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 265, 16, 14, 14, '- Melanzane 200g
- Ricotta 100g
- Pomodoro 80g
- Parmigiano 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 661, 'mediterranea', 30),
  ('cib-mediterranea-cena-merluzzo-con-olive-e-capperi-363', 'cena', 'Merluzzo con olive e capperi', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 266, 32, 3, 12, '- Merluzzo 180g
- Olive taggiasche 20g
- Capperi 10g
- Pomodorini 100g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 662, 'mediterranea', 25),
  ('cib-mediterranea-cena-minestrone-con-legumi-e-crostini-364', 'cena', 'Minestrone con legumi e crostini', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 85%.', 446, 17, 62, 12, '- Verdure miste 200g
- Fagioli borlotti 80g
- Pasta corta 40g
- Olio extravergine 10g
- Pane 30g', 'Cuocere verdure miste con fagioli. Servire con crostini e olio.', 663, 'mediterranea', 30),
  ('cib-mediterranea-cena-orata-al-cartoccio-365', 'cena', 'Orata al cartoccio', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 302, 37, 2, 15, '- Orata 200g
- Pomodorini 80g
- Olive 15g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 664, 'mediterranea', 30),
  ('cib-mediterranea-cena-orata-al-forno-con-verdure-366', 'cena', 'Orata al forno con verdure', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 85%.', 381, 38, 24, 14, '- Orata 200g
- Pomodorini 80g
- Patate 120g
- Olive nere 15g
- Olio extravergine 10g', 'Infornare l''orata con pomodorini, olive e patate.', 665, 'mediterranea', 35),
  ('cib-mediterranea-cena-parmigiana-di-melanzane-porzione-367', 'cena', 'Parmigiana di melanzane (porzione)', 'Piano: Mediterranea. Tempo: 60 min. Porzione donna ≈ 80%.', 320, 15, 18, 22, '- Parmigiana 180g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 666, 'mediterranea', 60),
  ('cib-mediterranea-cena-parmigiana-di-melanzane-light-368', 'cena', 'Parmigiana di melanzane light', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 482, 23, 35, 27, '- Melanzane 200g
- Passata di pomodoro 120g
- Mozzarella 60g
- Parmigiano 15g
- Basilico 3g
- Olio EVO 10g
- Pane 40g', 'Grigliare le melanzane (senza friggere), alternare strati con passata, mozzarella e parmigiano. Forno 180° per 25 min.', 667, 'mediterranea', 35),
  ('cib-mediterranea-cena-pasta-e-fagioli-369', 'cena', 'Pasta e fagioli', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 410, 15, 57, 11, '- Pasta corta 60g
- Fagioli borlotti 80g
- Passata pomodoro 60g
- Olio extravergine 10g', 'Cuocere fagioli con pasta corta, sedano, carote e pomodoro.', 668, 'mediterranea', 30),
  ('cib-mediterranea-cena-pesce-spada-alla-griglia-370', 'cena', 'Pesce spada alla griglia', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 335, 37, 4, 18, '- Pesce spada 180g
- Rucola 60g
- Pomodorini 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 669, 'mediterranea', 20),
  ('cib-mediterranea-cena-petto-di-pollo-alla-griglia-con-insalata-371', 'cena', 'Petto di pollo alla griglia con insalata', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 383, 40, 24, 13, '- Petto di pollo 150g
- Insalata mista 120g
- Pomodori 80g
- Olio extravergine 10g
- Pane 40g', 'Grigliare il petto di pollo, servire con insalata mista e olio.', 670, 'mediterranea', 15),
  ('cib-mediterranea-cena-petto-di-pollo-alla-griglia-con-verdure-372', 'cena', 'Petto di pollo alla griglia con verdure', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 268, 33, 4, 12, '- Petto di pollo 150g
- Zucchine grigliate 100g
- Pomodorini 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 671, 'mediterranea', 20),
  ('cib-mediterranea-cena-pollo-al-curry-leggero-373', 'cena', 'Pollo al curry leggero', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 409, 41, 49, 4, '- Petto di pollo 150g
- Yogurt greco 50g
- Curry 5g
- Riso basmati 60g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 672, 'mediterranea', 25),
  ('cib-mediterranea-cena-polpette-al-sugo-con-pure-374', 'cena', 'Polpette al sugo con purè', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 456, 31, 40, 20, '- Carne macinata magra 120g
- Pangrattato 15g
- Passata pomodoro 80g
- Patate 150g
- Latte 30g
- Olio extravergine 8g', 'Formare polpette con carne e pangrattato, cuocere nel sugo. Preparare il pure.', 673, 'mediterranea', 30),
  ('cib-mediterranea-cena-polpette-al-sugo-con-pure-375', 'cena', 'Polpette al sugo con purè', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 360, 23, 27, 18, '- Polpette di manzo 120g
- Salsa di pomodoro 80g
- Purè di patate 120g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 674, 'mediterranea', 30),
  ('cib-mediterranea-cena-risotto-ai-funghi-376', 'cena', 'Risotto ai funghi', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 441, 14, 64, 13, '- Riso Carnaroli 80g
- Funghi champignon 120g
- Parmigiano 15g
- Burro 10g
- Brodo vegetale 200g', 'Tostare il riso, aggiungere brodo gradualmente con funghi trifolati.', 675, 'mediterranea', 25),
  ('cib-mediterranea-cena-salmone-al-forno-con-asparagi-377', 'cena', 'Salmone al forno con asparagi', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 361, 33, 6, 22, '- Salmone 150g
- Asparagi 150g
- Limone 20g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 676, 'mediterranea', 25),
  ('cib-mediterranea-cena-salmone-al-forno-con-patate-378', 'cena', 'Salmone al forno con patate', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 464, 33, 26, 25, '- Filetto di salmone 150g
- Patate 150g
- Olio extravergine 8g', 'Infornare salmone e patate a 200C per 20 min con rosmarino e olio.', 677, 'mediterranea', 30),
  ('cib-mediterranea-cena-scaloppine-al-limone-379', 'cena', 'Scaloppine al limone', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 403, 36, 32, 14, '- Vitello fettine 150g
- Farina 00 10g
- Limone 30g
- Burro 10g
- Insalata mista 80g
- Pane 40g', 'Infarinare le fettine, cuocere nel burro, sfumare con limone. Servire con insalata e pane.', 678, 'mediterranea', 15),
  ('cib-mediterranea-cena-scaloppine-al-limone-380', 'cena', 'Scaloppine al limone', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 311, 32, 12, 15, '- Vitello 150g
- Limone 30g
- Farina 10g
- Olio EVO 10g
- Insalata 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 679, 'mediterranea', 20),
  ('cib-mediterranea-cena-sogliola-al-burro-con-spinaci-381', 'cena', 'Sogliola al burro con spinaci', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 258, 34, 4, 11, '- Sogliola 180g
- Burro 10g
- Spinaci 150g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 680, 'mediterranea', 20),
  ('cib-mediterranea-cena-sogliola-al-limone-con-riso-382', 'cena', 'Sogliola al limone con riso', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 476, 35, 57, 11, '- Sogliola 180g
- Riso basmati 70g
- Limone 20g
- Olio EVO 8g', 'Cuocere la sogliola in padella con limone e olio. Servire con riso bollito.', 681, 'mediterranea', 20),
  ('cib-mediterranea-cena-spiedini-di-pollo-e-verdure-383', 'cena', 'Spiedini di pollo e verdure', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 272, 31, 9, 12, '- Petto di pollo 140g
- Peperoni 80g
- Zucchine 80g
- Cipolla 40g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 682, 'mediterranea', 25),
  ('cib-mediterranea-cena-spigola-al-cartoccio-384', 'cena', 'Spigola al cartoccio', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 398, 36, 23, 18, '- Spigola filetti 180g
- Pomodorini 80g
- Olive nere 20g
- Capperi 10g
- Olio EVO 10g
- Patate 100g', 'Avvolgere la spigola nel cartoccio con pomodorini, olive e capperi. Cuocere in forno a 200° per 20 min. Patate al forno a parte.', 683, 'mediterranea', 30),
  ('cib-mediterranea-cena-straccetti-di-manzo-con-rucola-385', 'cena', 'Straccetti di manzo con rucola', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 453, 41, 24, 21, '- Manzo fettine 150g
- Rucola 40g
- Pomodorini 60g
- Parmigiano scaglie 15g
- Olio EVO 10g
- Pane 40g', 'Saltare le fettine in padella calda, servire su letto di rucola con parmigiano e pomodorini.', 684, 'mediterranea', 10),
  ('cib-mediterranea-cena-tagliata-di-manzo-con-rucola-386', 'cena', 'Tagliata di manzo con rucola', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 363, 39, 2, 22, '- Controfiletto di manzo 150g
- Rucola 60g
- Parmigiano a scaglie 20g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 685, 'mediterranea', 15),
  ('cib-mediterranea-cena-tonno-alla-piastra-con-ratatouille-387', 'cena', 'Tonno alla piastra con ratatouille', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 85%.', 321, 42, 8, 12, '- Tonno fresco 150g
- Melanzane 80g
- Zucchine 80g
- Pomodoro 80g
- Olio extravergine 10g', 'Grigliare il tonno fresco. Preparare ratatouille con melanzane, zucchine e pomodoro.', 686, 'mediterranea', 25),
  ('cib-mediterranea-cena-vellutata-di-zucca-con-crostini-388', 'cena', 'Vellutata di zucca con crostini', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 328, 11, 41, 13, '- Zucca 250g
- Patate 50g
- Crostini 30g
- Olio EVO 8g
- Parmigiano 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 687, 'mediterranea', 30),
  ('cib-mediterranea-cena-zuppa-di-legumi-389', 'cena', 'Zuppa di legumi', 'Piano: Mediterranea. Tempo: 40 min. Porzione donna ≈ 80%.', 504, 23, 70, 13, '- Mix legumi secchi 80g
- Carota 40g
- Sedano 30g
- Cipolla 30g
- Passata 60g
- Olio EVO 10g
- Pane tostato 40g', 'Cuocere i legumi con carota, sedano, cipolla e passata. Servire con pane tostato e olio a crudo.', 688, 'mediterranea', 40),
  ('cib-mediterranea-cena-zuppa-di-pesce-alla-livornese-390', 'cena', 'Zuppa di pesce alla livornese', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 422, 39, 31, 14, '- Pesce misto 200g
- Pomodoro 100g
- Pane tostato 40g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 689, 'mediterranea', 35),
  ('cib-mediterranea-colazione-biscotti-secchi-con-latte-caldo-391', 'colazione', 'Biscotti secchi con latte caldo', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 254, 8, 31, 11, '- Biscotti secchi 30g
- Latte intero 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 690, 'mediterranea', 5),
  ('cib-mediterranea-colazione-brioche-vuota-con-latte-macchiato-392', 'colazione', 'Brioche vuota con latte macchiato', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 246, 9, 32, 9, '- Brioche 50g
- Latte parzialmente scremato 150g
- Caffè 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 691, 'mediterranea', 5),
  ('cib-mediterranea-colazione-ciambellone-con-succo-di-mela-393', 'colazione', 'Ciambellone con succo di mela', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 307, 3, 53, 9, '- Ciambellone (fetta) 70g
- Succo di mela 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 692, 'mediterranea', 5),
  ('cib-mediterranea-colazione-cornetto-integrale-con-cappuccino-394', 'colazione', 'Cornetto integrale con cappuccino', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 281, 10, 37, 10, '- Cornetto integrale 60g
- Latte parzialmente scremato 150g
- Caffè espresso 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 693, 'mediterranea', 5),
  ('cib-mediterranea-colazione-cornetto-integrale-con-spremuta-395', 'colazione', 'Cornetto integrale con spremuta', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 271, 5, 45, 8, '- Cornetto integrale 50g
- Spremuta d''arancia 200g', 'Cornetto integrale dal forno con spremuta d''arancia fresca.', 694, 'mediterranea', 5),
  ('cib-mediterranea-colazione-crepes-con-ricotta-e-miele-396', 'colazione', 'Crêpes con ricotta e miele', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 314, 13, 42, 10, '- Farina 00 40g
- Uovo 30g
- Ricotta vaccina 60g
- Miele 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 695, 'mediterranea', 15),
  ('cib-mediterranea-colazione-fette-biscottate-con-marmellata-e-latte-397', 'colazione', 'Fette biscottate con marmellata e latte', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 298, 10, 51, 6, '- Fette biscottate 40g
- Marmellata di albicocche 20g
- Latte parzialmente scremato 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 696, 'mediterranea', 5),
  ('cib-mediterranea-colazione-fette-biscottate-con-marmellata-e-yogurt-398', 'colazione', 'Fette biscottate con marmellata e yogurt', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 259, 8, 41, 7, '- Fette biscottate integrali 40g
- Marmellata senza zucchero 20g
- Yogurt bianco 125g', 'Spalmare la marmellata sulle fette biscottate, accompagnare con yogurt.', 697, 'mediterranea', 3),
  ('cib-mediterranea-colazione-frullato-di-pesca-e-yogurt-399', 'colazione', 'Frullato di pesca e yogurt', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 148, 11, 26, 0, '- Pesca 150g
- Yogurt greco 100g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 698, 'mediterranea', 5),
  ('cib-mediterranea-colazione-gallette-di-riso-con-marmellata-e-te-400', 'colazione', 'Gallette di riso con marmellata e tè', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 181, 2, 41, 1, '- Gallette di riso 30g
- Marmellata 25g
- Tè verde 250g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 699, 'mediterranea', 5),
  ('cib-mediterranea-colazione-musli-con-latte-di-mandorla-e-banana-401', 'colazione', 'Müsli con latte di mandorla e banana', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 287, 7, 47, 7, '- Müsli 50g
- Latte di mandorla 200g
- Banana 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 700, 'mediterranea', 5),
  ('cib-mediterranea-colazione-overnight-oats-con-semi-di-chia-402', 'colazione', 'Overnight oats con semi di chia', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 315, 13, 43, 8, '- Fiocchi d''avena 45g
- Latte parzialmente scremato 150g
- Semi di chia 10g
- Miele 10g', 'La sera: mescolare avena, latte, chia e miele in un barattolo. Lasciare in frigo tutta la notte.', 701, 'mediterranea', 5),
  ('cib-mediterranea-colazione-pancake-integrali-con-frutti-di-bosco-403', 'colazione', 'Pancake integrali con frutti di bosco', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 319, 18, 41, 8, '- Farina integrale 50g
- Uovo 60g
- Latte parzialmente scremato 80g
- Frutti di bosco 80g', 'Mescolare farina, uovo e latte. Cuocere in padella antiaderente. Servire con frutti di bosco.', 702, 'mediterranea', 15),
  ('cib-mediterranea-colazione-pancake-proteici-con-mirtilli-404', 'colazione', 'Pancake proteici con mirtilli', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 313, 19, 50, 4, '- Farina d''avena 50g
- Albume d''uovo 100g
- Mirtilli 80g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 703, 'mediterranea', 15),
  ('cib-mediterranea-colazione-pane-e-burro-con-spremuta-d-arancia-405', 'colazione', 'Pane e burro con spremuta d''arancia', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 306, 6, 48, 9, '- Pane casereccio 60g
- Burro 10g
- Spremuta d''arancia 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 704, 'mediterranea', 5),
  ('cib-mediterranea-colazione-pane-integrale-con-ricotta-e-miele-406', 'colazione', 'Pane integrale con ricotta e miele', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 285, 12, 37, 10, '- Pane integrale 60g
- Ricotta vaccina 80g
- Miele 10g', 'Spalmare la ricotta sulle fette di pane, aggiungere un filo di miele.', 705, 'mediterranea', 5),
  ('cib-mediterranea-colazione-porridge-con-banana-e-burro-d-arachidi-407', 'colazione', 'Porridge con banana e burro d''arachidi', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 75%.', 414, 17, 55, 14, '- Fiocchi d''avena 50g
- Latte parzialmente scremato 150g
- Banana 80g
- Burro d''arachidi 15g', 'Cuocere i fiocchi d''avena con il latte, servire con banana a rondelle e burro d''arachidi.', 706, 'mediterranea', 10),
  ('cib-mediterranea-colazione-smoothie-proteico-con-latte-e-avena-408', 'colazione', 'Smoothie proteico con latte e avena', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 322, 11, 56, 5, '- Latte parzialmente scremato 200g
- Fiocchi d''avena 30g
- Banana 100g
- Miele 10g', 'Frullare tutti gli ingredienti fino ad ottenere un composto liscio.', 707, 'mediterranea', 5),
  ('cib-mediterranea-colazione-toast-avocado-e-uovo-409', 'colazione', 'Toast avocado e uovo', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 299, 13, 23, 16, '- Pane integrale 50g
- Avocado 60g
- Uovo sodo 60g', 'Tostare il pane, schiacciare l''avocado sopra, aggiungere l''uovo in camicia o sodo.', 708, 'mediterranea', 10),
  ('cib-mediterranea-colazione-toast-con-avocado-e-pomodorini-410', 'colazione', 'Toast con avocado e pomodorini', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 232, 7, 32, 9, '- Pane integrale 60g
- Avocado 50g
- Pomodorini 60g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 709, 'mediterranea', 5),
  ('cib-mediterranea-colazione-torta-allo-yogurt-fatta-in-casa-411', 'colazione', 'Torta allo yogurt fatta in casa', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 279, 9, 35, 11, '- Torta allo yogurt (fetta) 80g
- Latte parzialmente scremato 150g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 710, 'mediterranea', 5),
  ('cib-mediterranea-colazione-uova-strapazzate-con-pane-tostato-412', 'colazione', 'Uova strapazzate con pane tostato', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 334, 19, 23, 18, '- Uova intere 120g
- Pane integrale tostato 50g
- Olio extravergine 5g', 'Sbattere le uova, cuocere in padella antiaderente. Servire con pane tostato.', 711, 'mediterranea', 10),
  ('cib-mediterranea-colazione-yogurt-con-granola-e-fragole-413', 'colazione', 'Yogurt con granola e fragole', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 257, 10, 34, 9, '- Yogurt bianco 150g
- Granola 30g
- Fragole 100g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 712, 'mediterranea', 5),
  ('cib-mediterranea-colazione-yogurt-greco-con-muesli-e-frutta-414', 'colazione', 'Yogurt greco con muesli e frutta', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 317, 22, 46, 4, '- Yogurt greco 0% 170g
- Muesli integrale 40g
- Banana 80g', 'Versare il muesli sullo yogurt, aggiungere frutta fresca a pezzi.', 713, 'mediterranea', 5),
  ('cib-mediterranea-pranzo-bruschetta-con-pomodori-e-tonno-415', 'pranzo', 'Bruschetta con pomodori e tonno', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 392, 27, 45, 11, '- Pane casereccio 80g
- Tonno al naturale 80g
- Pomodorini 100g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 714, 'mediterranea', 10),
  ('cib-mediterranea-pranzo-bruschetta-pomodori-e-mozzarella-416', 'pranzo', 'Bruschetta pomodori e mozzarella', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 573, 23, 65, 23, '- Pane casereccio 120g
- Pomodori 120g
- Mozzarella 60g
- Basilico 3g
- Olio EVO 10g', 'Tostare il pane, condire con pomodoro a cubetti, mozzarella, basilico e olio.', 715, 'mediterranea', 10),
  ('cib-mediterranea-pranzo-cous-cous-con-ceci-e-verdure-417', 'pranzo', 'Cous cous con ceci e verdure', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 468, 18, 72, 12, '- Cous cous 70g
- Ceci cotti 80g
- Carote 60g
- Zucchine 60g
- Olio extravergine 8g', 'Idratare il cous cous, condire con ceci, carote, zucchine e olio.', 716, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-couscous-con-verdure-e-ceci-418', 'pranzo', 'Couscous con verdure e ceci', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 487, 17, 79, 11, '- Couscous 70g
- Ceci 80g
- Zucchine 80g
- Carote 50g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 717, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-farro-con-verdure-grigliate-419', 'pranzo', 'Farro con verdure grigliate', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 426, 13, 67, 13, '- Farro perlato 80g
- Zucchine 80g
- Peperoni 80g
- Melanzane 80g
- Olio EVO 10g', 'Cuocere il farro, grigliare le verdure tagliate a fette, condire con olio e sale.', 718, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-frittata-di-zucchine-con-insalata-420', 'pranzo', 'Frittata di zucchine con insalata', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 342, 23, 6, 24, '- Uova 120g
- Zucchine 150g
- Parmigiano 15g
- Insalata mista 80g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 719, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-gnocchi-al-pomodoro-e-basilico-421', 'pranzo', 'Gnocchi al pomodoro e basilico', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 347, 11, 63, 5, '- Gnocchi di patate 180g
- Salsa di pomodoro 80g
- Parmigiano 10g
- Basilico 3g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 720, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-insalata-caprese-con-pane-422', 'pranzo', 'Insalata caprese con pane', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 537, 27, 28, 34, '- Mozzarella di bufala 125g
- Pomodori 200g
- Basilico 5g
- Olio EVO 10g
- Pane 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 721, 'mediterranea', 10),
  ('cib-mediterranea-pranzo-insalata-di-farro-con-verdure-e-feta-423', 'pranzo', 'Insalata di farro con verdure e feta', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 447, 14, 55, 18, '- Farro 70g
- Peperoni 80g
- Cetrioli 60g
- Feta 40g
- Olio extravergine 8g', 'Cuocere il farro, mescolare con peperoni, cetrioli, feta e olio.', 722, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-insalata-di-farro-con-verdure-grigliate-424', 'pranzo', 'Insalata di farro con verdure grigliate', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 385, 16, 60, 8, '- Farro 80g
- Zucchine grigliate 100g
- Peperoni 80g
- Feta 30g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 723, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-insalata-di-riso-con-tonno-425', 'pranzo', 'Insalata di riso con tonno', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 509, 27, 71, 13, '- Riso parboiled 80g
- Tonno al naturale 80g
- Pomodorini 60g
- Olive 20g
- Mais 30g
- Olio EVO 8g', 'Cuocere il riso, raffreddare, aggiungere tonno sgocciolato, pomodorini, olive, mais e condire.', 724, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-insalata-di-tonno-con-fagioli-426', 'pranzo', 'Insalata di tonno con fagioli', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 85%.', 325, 37, 15, 11, '- Tonno al naturale 120g
- Fagioli cannellini 100g
- Pomodori 80g
- Olio extravergine 10g', 'Scolare il tonno, mescolare con fagioli, cipolla, pomodori e olio.', 725, 'mediterranea', 5),
  ('cib-mediterranea-pranzo-lasagne-al-ragu-porzione-427', 'pranzo', 'Lasagne al ragù (porzione)', 'Piano: Mediterranea. Tempo: 60 min. Porzione donna ≈ 80%.', 380, 18, 32, 20, '- Lasagna al ragù 200g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 726, 'mediterranea', 60),
  ('cib-mediterranea-pranzo-minestrone-con-crostini-428', 'pranzo', 'Minestrone con crostini', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 306, 11, 45, 8, '- Verdure miste 200g
- Patate 50g
- Fagioli 40g
- Crostini 30g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 727, 'mediterranea', 35),
  ('cib-mediterranea-pranzo-orecchiette-con-cime-di-rapa-429', 'pranzo', 'Orecchiette con cime di rapa', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 414, 15, 61, 12, '- Orecchiette 80g
- Cime di rapa 150g
- Aglio 5g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 728, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-orzo-con-gamberi-e-zucchine-430', 'pranzo', 'Orzo con gamberi e zucchine', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 465, 28, 59, 13, '- Orzo perlato 80g
- Gamberi sgusciati 100g
- Zucchine 100g
- Olio EVO 10g', 'Cuocere orzo, saltare gamberi e zucchine in padella con olio, unire tutto.', 729, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-panzanella-toscana-431', 'pranzo', 'Panzanella toscana', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 374, 8, 52, 14, '- Pane toscano raffermo 80g
- Pomodori 150g
- Cipolla rossa 30g
- Cetriolo 80g
- Olio EVO 12g
- Basilico 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 730, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-pasta-al-pesto-con-pomodorini-432', 'pranzo', 'Pasta al pesto con pomodorini', 'Piano: Mediterranea. Tempo: 12 min. Porzione donna ≈ 80%.', 393, 13, 60, 11, '- Pasta di semola 80g
- Pesto genovese 20g
- Pomodorini 80g', 'Cuocere la pasta, condire con pesto genovese e pomodorini tagliati a meta.', 731, 'mediterranea', 12),
  ('cib-mediterranea-pranzo-pasta-al-pesto-genovese-433', 'pranzo', 'Pasta al pesto genovese', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 451, 16, 57, 18, '- Pasta di semola 80g
- Pesto genovese 25g
- Parmigiano 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 732, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-pasta-al-pomodoro-con-parmigiano-434', 'pranzo', 'Pasta al pomodoro con parmigiano', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 455, 16, 60, 16, '- Pasta di semola 80g
- Passata di pomodoro 100g
- Parmigiano Reggiano 15g
- Olio extravergine 10g', 'Cuocere la pasta al dente, condire con sugo di pomodoro e parmigiano grattugiato.', 733, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-pasta-alla-norma-435', 'pranzo', 'Pasta alla norma', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 459, 16, 64, 14, '- Pasta 80g
- Melanzane 120g
- Pomodoro 100g
- Ricotta salata 20g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 734, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-pasta-cacio-e-pepe-436', 'pranzo', 'Pasta cacio e pepe', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 447, 21, 58, 15, '- Spaghetti 80g
- Pecorino romano 40g
- Pepe nero 2g', 'Cuocere la pasta, mantecare con pecorino grattugiato sciolto in acqua di cottura e pepe nero.', 735, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-pasta-con-le-sarde-437', 'pranzo', 'Pasta con le sarde', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 564, 31, 58, 23, '- Bucatini 80g
- Sarde fresche 100g
- Finocchietto 20g
- Pinoli 10g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 736, 'mediterranea', 30),
  ('cib-mediterranea-pranzo-pasta-con-lenticchie-438', 'pranzo', 'Pasta con lenticchie', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 549, 24, 82, 12, '- Ditalini 70g
- Lenticchie secche 60g
- Carota 30g
- Sedano 20g
- Olio EVO 10g', 'Cuocere le lenticchie con carota e sedano, aggiungere la pasta e cuocere insieme. Condire con olio a crudo.', 737, 'mediterranea', 30),
  ('cib-mediterranea-pranzo-pasta-e-ceci-439', 'pranzo', 'Pasta e ceci', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 512, 18, 74, 15, '- Mezze maniche 70g
- Ceci cotti 120g
- Passata di pomodoro 60g
- Rosmarino 2g
- Olio EVO 10g', 'Soffriggere rosmarino in olio, aggiungere ceci e passata, cuocere la pasta nel sugo allungato con acqua.', 738, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-pasta-e-fagioli-440', 'pranzo', 'Pasta e fagioli', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 398, 14, 59, 10, '- Pasta mista 60g
- Fagioli borlotti 80g
- Pomodoro 50g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 739, 'mediterranea', 30),
  ('cib-mediterranea-pranzo-pasta-integrale-con-zucchine-e-gamberetti-441', 'pranzo', 'Pasta integrale con zucchine e gamberetti', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 464, 29, 54, 13, '- Pasta integrale 80g
- Gamberetti 100g
- Zucchine 100g
- Olio extravergine 10g', 'Cuocere la pasta, saltare zucchine e gamberetti con aglio e olio.', 740, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-penne-all-arrabbiata-442', 'pranzo', 'Penne all''arrabbiata', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 434, 12, 64, 14, '- Penne rigate 80g
- Passata di pomodoro 120g
- Aglio 5g
- Peperoncino 2g
- Olio EVO 12g
- Prezzemolo 3g', 'Soffriggere aglio e peperoncino in olio, aggiungere passata, cuocere 15 min. Condire la pasta.', 741, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-pennette-all-arrabbiata-443', 'pranzo', 'Pennette all''arrabbiata', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 397, 11, 60, 12, '- Penne rigate 80g
- Pomodori pelati 100g
- Peperoncino 2g
- Olio EVO 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 742, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-petto-di-tacchino-con-riso-e-insalata-444', 'pranzo', 'Petto di tacchino con riso e insalata', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 492, 36, 56, 13, '- Petto di tacchino 130g
- Riso basmati 70g
- Insalata mista 80g
- Olio extravergine 10g', 'Grigliare il tacchino, servire con riso bianco e insalata mista.', 743, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-piadina-con-prosciutto-e-mozzarella-445', 'pranzo', 'Piadina con prosciutto e mozzarella', 'Piano: Mediterranea. Tempo: 8 min. Porzione donna ≈ 80%.', 461, 25, 42, 21, '- Piadina 80g
- Prosciutto cotto 50g
- Mozzarella 50g
- Rucola 20g', 'Farcire la piadina con prosciutto, mozzarella e rucola. Scaldare in padella.', 744, 'mediterranea', 8),
  ('cib-mediterranea-pranzo-polpo-con-patate-446', 'pranzo', 'Polpo con patate', 'Piano: Mediterranea. Tempo: 50 min. Porzione donna ≈ 80%.', 365, 29, 30, 14, '- Polpo 150g
- Patate 150g
- Prezzemolo 5g
- Limone 15g
- Olio EVO 12g', 'Bollire il polpo per 40 min, lessare le patate, tagliare a pezzi e condire con olio, limone e prezzemolo.', 745, 'mediterranea', 50),
  ('cib-mediterranea-pranzo-polpo-con-patate-447', 'pranzo', 'Polpo con patate', 'Piano: Mediterranea. Tempo: 40 min. Porzione donna ≈ 80%.', 333, 27, 24, 12, '- Polpo 150g
- Patate 150g
- Olio EVO 10g
- Prezzemolo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 746, 'mediterranea', 40),
  ('cib-mediterranea-pranzo-riso-basmati-con-petto-di-pollo-e-verdure-448', 'pranzo', 'Riso basmati con petto di pollo e verdure', 'Piano: Mediterranea. Tempo: 20 min. Porzione donna ≈ 80%.', 519, 35, 64, 13, '- Riso basmati 80g
- Petto di pollo 120g
- Zucchine 100g
- Olio extravergine 10g', 'Cuocere il riso. Grigliare il pollo e saltare le verdure in padella con olio.', 747, 'mediterranea', 20),
  ('cib-mediterranea-pranzo-riso-venere-con-gamberi-e-zucchine-449', 'pranzo', 'Riso venere con gamberi e zucchine', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 467, 32, 59, 11, '- Riso venere 80g
- Gamberi 120g
- Zucchine 100g
- Olio EVO 8g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 748, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-risotto-ai-funghi-porcini-450', 'pranzo', 'Risotto ai funghi porcini', 'Piano: Mediterranea. Tempo: 30 min. Porzione donna ≈ 80%.', 394, 13, 59, 10, '- Riso arborio 80g
- Funghi porcini 100g
- Parmigiano 15g
- Olio EVO 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 749, 'mediterranea', 30),
  ('cib-mediterranea-pranzo-risotto-alla-milanese-451', 'pranzo', 'Risotto alla milanese', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 515, 12, 76, 18, '- Riso carnaroli 90g
- Brodo vegetale 300g
- Cipolla 30g
- Burro 15g
- Parmigiano 15g
- Zafferano 0.5g', 'Soffriggere cipolla nel burro, tostare il riso, aggiungere brodo poco alla volta. A fine cottura aggiungere zafferano e parmigiano.', 750, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-spaghetti-alle-vongole-452', 'pranzo', 'Spaghetti alle vongole', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 448, 22, 58, 13, '- Spaghetti 80g
- Vongole 150g
- Olio EVO 10g
- Prezzemolo 5g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 751, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-tortellini-in-brodo-453', 'pranzo', 'Tortellini in brodo', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 381, 21, 39, 16, '- Tortellini 120g
- Brodo di carne 300g
- Parmigiano 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 752, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-trofie-al-pesto-con-fagiolini-454', 'pranzo', 'Trofie al pesto con fagiolini', 'Piano: Mediterranea. Tempo: 25 min. Porzione donna ≈ 80%.', 450, 15, 69, 12, '- Trofie 80g
- Pesto 20g
- Fagiolini 80g
- Patate 50g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 753, 'mediterranea', 25),
  ('cib-mediterranea-pranzo-wrap-con-pollo-e-verdure-455', 'pranzo', 'Wrap con pollo e verdure', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 85%.', 314, 31, 32, 7, '- Tortilla integrale 60g
- Petto di pollo 100g
- Lattuga 30g
- Pomodoro 50g
- Yogurt greco 30g', 'Farcire la tortilla con pollo grigliato, lattuga, pomodoro e salsa yogurt.', 754, 'mediterranea', 15),
  ('cib-mediterranea-pranzo-zuppa-di-lenticchie-456', 'pranzo', 'Zuppa di lenticchie', 'Piano: Mediterranea. Tempo: 35 min. Porzione donna ≈ 80%.', 460, 21, 62, 12, '- Lenticchie 80g
- Carote 50g
- Sedano 30g
- Pomodoro 50g
- Olio EVO 10g
- Pane 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 755, 'mediterranea', 35),
  ('cib-mediterranea-spuntino-banana-con-burro-d-arachidi-457', 'spuntino', 'Banana con burro d''arachidi', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 177, 5, 22, 8, '- Banana 100g
- Burro d''arachidi 15g', 'Tagliare la banana a rondelle e spalmare un po'' di burro d''arachidi.', 756, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-banana-con-burro-d-arachidi-458', 'spuntino', 'Banana con burro d''arachidi', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 177, 5, 22, 8, '- Banana 100g
- Burro d''arachidi 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 757, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-barretta-ai-cereali-e-frutta-459', 'spuntino', 'Barretta ai cereali e frutta', 'Piano: Mediterranea. Tempo: 1 min. Porzione donna ≈ 90%.', 140, 3, 22, 5, '- Barretta cereali e frutta 35g', 'Barretta confezionata ai cereali con frutta secca.', 758, 'mediterranea', 1),
  ('cib-mediterranea-spuntino-bruschetta-pomodoro-e-basilico-460', 'spuntino', 'Bruschetta pomodoro e basilico', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 167, 4, 24, 6, '- Pane 40g
- Pomodoro 80g
- Olio EVO 5g
- Basilico 3g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 759, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-centrifuga-di-carote-e-mela-461', 'spuntino', 'Centrifuga di carote e mela', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 114, 1, 26, 0, '- Carote 150g
- Mela 100g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 760, 'mediterranea', 10),
  ('cib-mediterranea-spuntino-crackers-integrali-con-hummus-462', 'spuntino', 'Crackers integrali con hummus', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 186, 6, 22, 8, '- Crackers integrali 30g
- Hummus 40g', 'Spalmare l''hummus sui crackers.', 761, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-crackers-integrali-con-hummus-463', 'spuntino', 'Crackers integrali con hummus', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 186, 6, 26, 7, '- Crackers integrali 30g
- Hummus 40g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 762, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-fichi-secchi-e-mandorle-464', 'spuntino', 'Fichi secchi e mandorle', 'Piano: Mediterranea. Porzione donna ≈ 80%.', 161, 4, 18, 9, '- Fichi secchi 30g
- Mandorle 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 763, 'mediterranea', 0),
  ('cib-mediterranea-spuntino-fiocchi-di-latte-con-pomodorini-465', 'spuntino', 'Fiocchi di latte con pomodorini', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 140, 13, 6, 7, '- Fiocchi di latte 100g
- Pomodorini 80g
- Olio extravergine 3g', 'Servire i fiocchi di latte con pomodorini tagliati e un filo d''olio.', 764, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-frullato-di-frutta-con-latte-466', 'spuntino', 'Frullato di frutta con latte', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 90%.', 155, 7, 25, 2, '- Fragole 100g
- Banana 60g
- Latte parzialmente scremato 150g', 'Frullare frutta con latte freddo.', 765, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-frutta-fresca-con-cioccolato-fondente-467', 'spuntino', 'Frutta fresca con cioccolato fondente', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 90%.', 159, 1, 24, 6, '- Mela 150g
- Cioccolato fondente 70% 15g', 'Tagliare la frutta a pezzi e accompagnare con quadratini di cioccolato fondente.', 766, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-frutta-secca-mista-468', 'spuntino', 'Frutta secca mista', 'Piano: Mediterranea. Porzione donna ≈ 80%.', 214, 6, 3, 20, '- Mandorle 15g
- Noci 10g
- Nocciole 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 767, 'mediterranea', 0),
  ('cib-mediterranea-spuntino-gallette-di-riso-con-ricotta-e-miele-469', 'spuntino', 'Gallette di riso con ricotta e miele', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 163, 7, 22, 5, '- Gallette di riso 20g
- Ricotta 50g
- Miele 5g', 'Spalmare ricotta sulle gallette, aggiungere un goccio di miele.', 768, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-gelato-alla-frutta-coppetta-470', 'spuntino', 'Gelato alla frutta (coppetta)', 'Piano: Mediterranea. Porzione donna ≈ 80%.', 128, 1, 20, 5, '- Gelato alla frutta 80g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 769, 'mediterranea', 0),
  ('cib-mediterranea-spuntino-grissini-con-prosciutto-crudo-471', 'spuntino', 'Grissini con prosciutto crudo', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 147, 8, 18, 5, '- Grissini 25g
- Prosciutto crudo 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 770, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-macedonia-di-frutta-fresca-472', 'spuntino', 'Macedonia di frutta fresca', 'Piano: Mediterranea. Tempo: 10 min. Porzione donna ≈ 80%.', 93, 1, 22, 0, '- Frutta mista 200g
- Limone 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 771, 'mediterranea', 10),
  ('cib-mediterranea-spuntino-mela-cotta-con-cannella-473', 'spuntino', 'Mela cotta con cannella', 'Piano: Mediterranea. Tempo: 15 min. Porzione donna ≈ 80%.', 113, 0, 27, 0, '- Mela 150g
- Cannella 2g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 772, 'mediterranea', 15),
  ('cib-mediterranea-spuntino-pane-e-cioccolato-fondente-474', 'spuntino', 'Pane e cioccolato fondente', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 159, 3, 21, 7, '- Pane 30g
- Cioccolato fondente 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 773, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-parmigiano-con-noci-475', 'spuntino', 'Parmigiano con noci', 'Piano: Mediterranea. Tempo: 2 min. Porzione donna ≈ 80%.', 216, 12, 1, 19, '- Parmigiano Reggiano 30g
- Noci 15g', 'Tagliare il parmigiano a scaglie, accompagnare con noci.', 774, 'mediterranea', 2),
  ('cib-mediterranea-spuntino-spremuta-d-arancia-con-biscotto-476', 'spuntino', 'Spremuta d''arancia con biscotto', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 135, 2, 26, 2, '- Spremuta 200g
- Biscotto secco 15g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 775, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-toast-con-marmellata-477', 'spuntino', 'Toast con marmellata', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 115, 2, 25, 1, '- Pane in cassetta 25g
- Marmellata 20g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 776, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-toast-con-prosciutto-crudo-478', 'spuntino', 'Toast con prosciutto crudo', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 136, 10, 13, 5, '- Pane integrale 30g
- Prosciutto crudo 30g', 'Farcire il pane tostato con prosciutto crudo.', 777, 'mediterranea', 3),
  ('cib-mediterranea-spuntino-yogurt-con-noci-e-miele-479', 'spuntino', 'Yogurt con noci e miele', 'Piano: Mediterranea. Tempo: 5 min. Porzione donna ≈ 80%.', 205, 7, 15, 13, '- Yogurt bianco 125g
- Noci 15g
- Miele 10g', 'Prepara gli ingredienti nelle quantità indicate e combina secondo preferenza.', 778, 'mediterranea', 5),
  ('cib-mediterranea-spuntino-yogurt-greco-con-frutta-secca-480', 'spuntino', 'Yogurt greco con frutta secca', 'Piano: Mediterranea. Tempo: 3 min. Porzione donna ≈ 85%.', 173, 18, 6, 8, '- Yogurt greco 0% 150g
- Mandorle 15g', 'Aggiungere frutta secca tritata allo yogurt greco.', 779, 'mediterranea', 3)
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  per_serving_kcal = EXCLUDED.per_serving_kcal,
  per_serving_protein_g = EXCLUDED.per_serving_protein_g,
  per_serving_carbs_g = EXCLUDED.per_serving_carbs_g,
  per_serving_fat_g = EXCLUDED.per_serving_fat_g,
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions,
  sort_order = EXCLUDED.sort_order,
  diet_plan = EXCLUDED.diet_plan,
  prep_time_min = EXCLUDED.prep_time_min;
