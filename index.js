const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 8080;
const sharp = require('sharp');
const { DateTime } = require("luxon");
const { Pool } = require('pg');
require("dotenv").config();

process.env.DB_USER = "postgres";
process.env.DB_HOST = "localhost";
process.env.DB_NAME = "proiectweb";
process.env.DB_PASSWORD = "parola123";
process.env.DB_PORT = 5432;


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false
});

app.locals.formatDate = (date) => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(date).toLocaleDateString('ro-RO', options);
};

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Eroare conexiune PostgreSQL:", err);
  } else {
    console.log("Conectat la PostgreSQL. Timp curent:", res.rows[0].now);
  }
});

const obGlobal = {
    obErori: null
};

const sass = require('sass');

obGlobal.folderScss = path.join(__dirname, "resurse/sass");
obGlobal.folderCss = path.join(__dirname, "resurse/stiluri");

function initErori() {
    const caleErori = path.join(__dirname, "resurse/json/erori.json");
    const continut = fs.readFileSync(caleErori, "utf-8");
    obGlobal.obErori = JSON.parse(continut);

    obGlobal.obErori.cale_baza = "/resurse/imagini/erori"; 

}

initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare;
    
    if (typeof identificator === 'undefined') {
        eroare = obGlobal.obErori.eroare_default;
    } else {
        eroare = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
    }

    if (!eroare) {
        eroare = obGlobal.obErori.eroare_default;
    }

    if (eroare.status && identificator) {
        res.status(identificator);
    } else {
        res.status(500);
    }

    const dateEroare = {
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || "/resurse/imagini/erori/" + eroare.imagine
    };

    res.render("pagini/eroare", dateEroare);
}



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
    res.locals.userIP = req.ip;
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/resurse", (req, res, next) => {
    if (path.extname(req.path) === '') {
        afisareEroare(res, 403);
    } else {
        next();
    }
});


app.use((req, res, next) => {
    if (req.url.endsWith(".ejs")) {
        afisareEroare(res, 400);
    } else {
        next();
    }
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse", "favicon", "favicon.ico"));
});

const vect_foldere = ["temp","backup","temp1"];
vect_foldere.forEach(f => {
    const caleFolder = path.join(__dirname, f);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
        console.log("Am creat folderul:", caleFolder);
    }
});

app.use(async (req, res, next) => {
    try {
        // Interoghează baza de date pentru categorii
        const categoriiResult = await pool.query('SELECT DISTINCT categorie_mare FROM produse');
        res.locals.categorii = categoriiResult.rows.map(row => row.categorie_mare);
        next();
    } catch (err) {
        next(err); // Transmite eroarea către middleware-ul de gestionare a erorilor
    }
});

const mainRoutes = ['/', '/index', '/home'];
app.get(mainRoutes, async (req, res) => {
    try {

        const caleGalerie = path.join(__dirname, 'resurse/json/galerie.json');
        const dateGalerie = JSON.parse(fs.readFileSync(caleGalerie, 'utf-8'));
        
        const now = DateTime.now();
        const month = now.month;
        let anotimp;
        
        if(month >= 3 && month <= 5) anotimp = 'primavara';
        else if(month >= 6 && month <= 8) anotimp = 'vara';
        else if(month >= 9 && month <= 11) anotimp = 'toamna';
        else anotimp = 'iarna';

        const imaginiFiltrate = dateGalerie.imagini
            .filter(img => img.anotimp === anotimp)
            .slice(0, 13);

        res.render("pagini/index", {
            caleBase: dateGalerie.cale_galerie,
            imagini: imaginiFiltrate,
            anotimpCurent: anotimp
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res, 500);
    }
});




const galerieConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'resurse/json/galerie.json'), 'utf-8'));
const caleGalerieOriginal = path.join(__dirname, galerieConfig.cale_galerie.replace('./', ''));

app.get('/resized/:width/:image', async (req, res) => {
  try {
    const width = parseInt(req.params.width);
    const imageName = req.params.image;
    const allowedWidths = [200, 300, 400];
    
    if (!allowedWidths.includes(width)) {
      return res.status(400).send('Dimensiune nepermisă');
    }

    const originalPath = path.join(caleGalerieOriginal, imageName);
    const resizedDir = path.join(caleGalerieOriginal, 'resized');
    const resizedPath = path.join(resizedDir, `${width}-${imageName}`);

    if (!fs.existsSync(resizedDir)) {
      fs.mkdirSync(resizedDir, { recursive: true });
    }

    if (fs.existsSync(resizedPath)) {
      return res.sendFile(resizedPath);
    }

    await sharp(originalPath)
      .resize(width)
      .toFile(resizedPath);
    
    res.sendFile(resizedPath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Eroare procesare imagine');
  }
});

app.get('/galerie', async (req, res) => {
    try {
        const caleGalerie = path.join(__dirname, 'resurse', 'json', 'galerie.json');
        
        if (!fs.existsSync(caleGalerie)) {
            throw new Error("Fișierul galerie.json nu există!");
        }

        const continutJSON = fs.readFileSync(caleGalerie, 'utf-8');
        const dateGalerie = JSON.parse(continutJSON);

        const now = DateTime.now();
        const month = now.month;
        //const month=10;
        let anotimp;
        
        if (month >= 3 && month <= 5) anotimp = 'primavara';
        else if (month >= 6 && month <= 8) anotimp = 'vara';
        else if (month >= 9 && month <= 11) anotimp = 'toamna';
        else anotimp = 'iarna';

        const imaginiFiltrate = dateGalerie.imagini
            .filter(img => img.anotimp === anotimp)
            .slice(0, 13);

        res.render("pagini/galerie", {
            caleBase: dateGalerie.cale_galerie,
            imagini: imaginiFiltrate,
            anotimpCurent: anotimp
        });

    } catch (err) {
        console.error("Eroare la încărcarea galeriei:", err.message);
        afisareEroare(res, 500);
    }
});

app.get('/produse', async (req, res) => {
    try {
        const categorie = req.query.categorie;

        let query = `
            SELECT 
                id, nume, descriere, categorie_mare, 
                culoare, pret, kilometraj, garantie_extensibila,
                data_adaugare, imagine, categorie_secundara
            FROM produse
        `;

        const params = [];

        if (categorie && categorie.toLowerCase() !== 'toate') {
            query += ` WHERE categorie_mare = $1`;
            params.push(categorie);
        }

        const { rows: produse } = await pool.query(query, params);

        const preturi = produse.map(p => p.pret);

        res.render('pagini/produse', {
            produse,
            categorii: res.locals.categorii,
            minPret: preturi.length ? Math.min(...preturi) : 0,
            maxPret: preturi.length ? Math.max(...preturi) : 0
        });

    } catch (err) {
        afisareEroare(res, 500);
    }
});


app.get('/vanzari_masini', async (req, res) => {
    try {
        let query = 'SELECT * FROM produse';
        const { sortare, categorie } = req.query;
        const params = [];
        
        // Filtrare
        if (categorie) {
            query += ' WHERE categorie_mare = $1';
            params.push(categorie);
        }

        // Sortare
        if (sortare === 'pret-asc') {
            query += ' ORDER BY pret ASC';
        } else if (sortare === 'pret-desc') {
            query += ' ORDER BY pret DESC';
        } else if (sortare === 'km-asc') {
            query += ' ORDER BY kilometraj ASC';
        }

        const { rows } = await pool.query(query, params);
        res.render('pagini/vanzari_masini', { 
            produse: rows,
            queryParams: req.query
        });
    } catch (err) {
        afisareEroare(res, 500);
    }
});

app.get('/produs/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM produse WHERE id = $1', [req.params.id]);
        if (!rows.length) return afisareEroare(res, 404);
        res.render('pagini/produs', { produs: rows[0] });
    } catch (err) {
        afisareEroare(res, 500);
    }
});

app.get("/:pagina", (req, res) => {
    const pagina = req.params.pagina;
    res.render(`pagini/${pagina}`, (err, html) => {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500);
            }
        } else {
            res.send(html);
        }
    });
});


app.listen(port, () => {
    console.log(`Serverul rulează la adresa http://localhost:${port}`);
});

function compileazaScss(caleScss, caleCss) {
    const caleCompletaScss = path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);
    const numeFisier = path.basename(caleCompletaScss, ".scss");

    const caleCompletaCss = caleCss
        ? (path.isAbsolute(caleCss) ? caleCss : path.join(obGlobal.folderCss, caleCss))
        : path.join(obGlobal.folderCss, numeFisier + ".css");

    const caleBackup = path.join(__dirname, "backup", "resurse", "css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    if (fs.existsSync(caleCompletaCss)) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const numeBackup = `${numeFisier}_${timestamp}.css`;
        try {
            fs.copyFileSync(caleCompletaCss, path.join(caleBackup, numeBackup));
            console.log(`Backup salvat pentru ${numeFisier}`);
        } catch (err) {
            console.error("Eroare la salvarea backupului:", err);
        }
    }

    try {
        const rez = sass.compile(caleCompletaScss, { style: "expanded" });
        fs.writeFileSync(caleCompletaCss, rez.css);
        console.log("Compilat:", caleCompletaCss);
    } catch (err) {
        console.error("Eroare compilare SCSS:", err);
    }
}

fs.readdirSync(obGlobal.folderScss).forEach(fisier => {
    if (path.extname(fisier) === ".scss") {
        compileazaScss(fisier);
    }
});

fs.watch(obGlobal.folderScss, (event, filename) => {
    if (filename && path.extname(filename) === ".scss") {
        console.log(`Fișier modificat: ${filename}`);
        compileazaScss(filename);
    }
});


console.log("Calea folderului (__dirname):", __dirname);
console.log("Calea fișierului (__filename):", __filename);
console.log("Folderul curent de lucru (process.cwd()):", process.cwd());

