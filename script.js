var RAPIDAPI_HOST = "youtube-music-api3.p.rapidapi.com";
var RAPIDAPI_KEY  = "ff96a9d414msh286cbe7c923e07ep13176ajsn170225b0b7d2"; 
var URL_ARTIST    = "https://" + RAPIDAPI_HOST + "/getArtists?id=";
var URL_SEARCH    = "https://" + RAPIDAPI_HOST + "/search?q=";
var MAX_PER_SECTION = 4;

var form = document.getElementById("formId");
var input = document.getElementById("txtId");
var estado = document.getElementById("estado");
var cajaArtista = document.getElementById("cajaArtista");
var fechaHoy = document.getElementById("fechaHoy");

var secSongs   = document.getElementById("secSongs");
var secAlbums  = document.getElementById("secAlbums");
var secSingles = document.getElementById("secSingles");
var secVideos  = document.getElementById("secVideos");
var secRelated = document.getElementById("secRelated");

var rowSongs   = document.getElementById("rowSongs");
var rowAlbums  = document.getElementById("rowAlbums");
var rowSingles = document.getElementById("rowSingles");
var rowVideos  = document.getElementById("rowVideos");
var rowRelated = document.getElementById("rowRelated");

try{
  fechaHoy.textContent = new Date().toLocaleDateString("es-GT", {year:"numeric", month:"long", day:"numeric"});
}catch(e){}

function ponerEstado(html){ estado.innerHTML = html || ""; }
function truncar(texto, max){
  if(!texto) return "";
  return texto.length > max ? (texto.slice(0, max).trim() + "…") : texto;
}
function limpiarSecciones(){
  cajaArtista.innerHTML = "";
  rowSongs.innerHTML = "";
  rowAlbums.innerHTML = "";
  rowSingles.innerHTML = "";
  rowVideos.innerHTML = "";
  rowRelated.innerHTML = "";

  secSongs.style.display   = "";
  secAlbums.style.display  = "";
  secSingles.style.display = "";
  secVideos.style.display  = "";
  secRelated.style.display = "";
}
function crearColTarjeta(titulo, thumb, desc, badge){
  var col = document.createElement("div");
  col.className = "col-12 col-sm-6 col-md-4 col-lg-3";
  if(!thumb){ thumb = "https://via.placeholder.com/480x360?text=Sin+Imagen"; }
  if(!desc){ desc = ""; }

  col.innerHTML =
    '<article class="tarjeta h-100">'+
      '<img src="'+thumb+'" alt="'+titulo+'" loading="lazy">'+
      '<div class="cuerpo">'+
        '<div class="d-flex flex-wrap gap-2 mb-2">'+
          (badge ? '<span class="badge-soft">'+badge+'</span>' : '')+
        '</div>'+
        '<h3 class="h6 m-0">'+(titulo || "Sin título")+'</h3>'+
        '<p class="m-0 text-muted">'+desc+'</p>'+
      '</div>'+
    '</article>';
  return col;
}
function vacioRow(row, texto){
  var col = document.createElement("div");
  col.className = "col-12";
  col.innerHTML = '<div class="alert alert-light border m-0">'+texto+'</div>';
  row.appendChild(col);
}
function getThumb(obj){
  if(obj && obj.thumbnails && obj.thumbnails.length && obj.thumbnails[0].url) return obj.thumbnails[0].url;
  if(obj && obj.thumbnail) return obj.thumbnail;
  return "";
}
function getArtistsText(obj){
  var nombres = [];
  if(obj && obj.artists && obj.artists.length){
    for(var i=0;i<obj.artists.length;i++){
      if(obj.artists[i] && obj.artists[i].name){ nombres.push(obj.artists[i].name); }
    }
  }
  return nombres.join(", ");
}
function getId(it){
  var id = (it && (it.videoId || it.albumId || it.playlistId || it.browseId || it.channelId || it.id)) || "";
  if(!id){
    id = (it && (it.title || it.name || "")) + "|" + getThumb(it); // fallback simple para deduplicar
  }
  return String(id);
}

var usadosAll = new Set();
var usados = {
  songs:   new Set(),
  albums:  new Set(),
  singles: new Set(),
  videos:  new Set(),
  related: new Set()
};

function addFromListToRow(lista, row, badge, sectionKey, max){
  var added = 0;
  var local = usados[sectionKey];
  for(var i=0; i<(lista||[]).length && added<max; i++){
    var it = lista[i];
    var id = getId(it);
    if(usadosAll.has(id) || local.has(id)) continue;

    var titulo = it.title || it.name || (it.album && it.album.name) || "Sin título";
    var desc = "";
    var artistas = getArtistsText(it);
    if(artistas){ desc = "Artista(s): " + artistas; }
    else if(it.album && it.album.name){ desc = "Álbum: " + it.album.name; }
    else if(it.year){ desc = "Año: " + it.year; }
    else if(it.views){ desc = "Vistas: " + it.views; }

    var thumb = getThumb(it);
    row.appendChild(crearColTarjeta(titulo, thumb, desc, badge));
    usadosAll.add(id);
    local.add(id);
    added++;
  }
  return added;
}

function pintarArtista(root){
  var nombre = root.name || root.title || "Artista";
  var thumb = getThumb(root);
  var desc = root.description ? truncar(root.description, 180)
           : (root.subscribers ? "Suscriptores: " + root.subscribers
           : (root.channelId ? "Canal: " + root.channelId
           : "Perfil de artista en YouTube Music."));

  var html = '<div class="box-suave d-flex align-items-center gap-3">';
  if(thumb){ html += '<img src="'+thumb+'" alt="'+nombre+'" style="width:96px;height:96px;object-fit:cover;border-radius:12px">'; }
  html += '<div><h2 class="h5 m-0">'+nombre+'</h2><p class="m-0 text-muted">'+desc+'</p></div></div>';
  cajaArtista.innerHTML = html;
}

function buscarParaRellenar(query, tipo, row, badge, sectionKey, faltantes, textoVacio){
  if(faltantes <= 0){
    if(row.children.length === 0) vacioRow(row, textoVacio);
    return Promise.resolve();
  }
  var url = URL_SEARCH + encodeURIComponent(query) + "&type=" + tipo;

  return fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
      "Accept": "application/json"
    }
  })
  .then(function(res){ if(!res.ok) throw new Error("search "+tipo); return res.json(); })
  .then(function(data){
    var lista = [];
    if (Array.isArray(data)) lista = data;
    else if (Array.isArray(data.result)) lista = data.result;
    else if (Array.isArray(data.results)) lista = data.results;
    else if (Array.isArray(data.songs)) lista = data.songs;
    else if (Array.isArray(data.albums)) lista = data.albums;
    else if (Array.isArray(data.videos)) lista = data.videos;
    else if (Array.isArray(data.artists)) lista = data.artists;

    var agregados = addFromListToRow(lista, row, badge, sectionKey, faltantes);
    if(agregados === 0 && row.children.length === 0){
      vacioRow(row, textoVacio);
    }
  })
  .catch(function(){
    if(row.children.length === 0){
      vacioRow(row, textoVacio);
    }
  });
}

function getRoot(data){
  if(data && data.artist) return data.artist;
  if(data && data.data) return data.data;
  if(data && data.result) return data.result;
  if(data && (data.name || data.title)) return data;
  return data || {};
}

function cargarArtista(channelId){
  var url = URL_ARTIST + encodeURIComponent(channelId);

  usadosAll = new Set();
  usados = { songs:new Set(), albums:new Set(), singles:new Set(), videos:new Set(), related:new Set() };

  ponerEstado(
    '<div class="d-flex align-items-center gap-2">'+
      '<div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>'+
      '<span>Cargando…</span>'+
    '</div>'
  );
  limpiarSecciones();

  fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
      "Accept": "application/json"
    }
  })
  .then(function(res){
    if(!res.ok){ throw new Error("getArtists"); }
    return res.json();
  })
  .then(function(data){
    var root = getRoot(data);
    var nombreArtista = root.name || root.title || (root.channelId || channelId);

    pintarArtista(root);

    var songs   = root.topSongs || root.songs || root.tracks || [];
    var albums  = root.albums  || [];
    var singles = root.singles || root.ep || [];
    var videos  = root.videos  || root.musicVideos || [];
    var related = root.related || root.relatedArtists || root.similar || [];

    var addedSongs   = addFromListToRow(songs,   rowSongs,   "Canción", "songs",   MAX_PER_SECTION);
    var addedAlbums  = addFromListToRow(albums,  rowAlbums,  "Álbum",   "albums",  MAX_PER_SECTION);
    var addedSingles = addFromListToRow(singles, rowSingles, "Single",  "singles", MAX_PER_SECTION);
    var addedVideos  = addFromListToRow(videos,  rowVideos,  "Video",   "videos",  MAX_PER_SECTION);
    var addedRelated = addFromListToRow(related, rowRelated, "Artista", "related", MAX_PER_SECTION);

    var p1 = buscarParaRellenar(nombreArtista,            "song",  rowSongs,   "Canción", "songs",   MAX_PER_SECTION - addedSongs,   "No hay canciones disponibles.");
    var p2 = buscarParaRellenar(nombreArtista,            "album", rowAlbums,  "Álbum",   "albums",  MAX_PER_SECTION - addedAlbums,  "No hay álbumes disponibles.");
    var p3 = buscarParaRellenar(nombreArtista + " single","song",  rowSingles, "Single",  "singles", MAX_PER_SECTION - addedSingles, "No hay singles disponibles.");
    var p4 = buscarParaRellenar(nombreArtista,            "video", rowVideos,  "Video",   "videos",  MAX_PER_SECTION - addedVideos,  "No hay videos disponibles.");
    var p5 = buscarParaRellenar(nombreArtista,            "artist",rowRelated, "Artista", "related", MAX_PER_SECTION - addedRelated, "No hay artistas relacionados.");

    return Promise.all([p1,p2,p3,p4,p5]).then(function(){ ponerEstado(""); });
  })
  .catch(function(err){
    console.error(err);
    ponerEstado('<div class="alert alert-danger m-0">Ocurrió un error al consultar el API. Revisa tu clave de RapidAPI y el ID del artista.</div>');
  });
}

form.addEventListener("submit", function(e){
  e.preventDefault();
  var id = (input.value || "").trim();
  if(!id){ return; }
  cargarArtista(id);
});

document.addEventListener("DOMContentLoaded", function(){
  form.requestSubmit();
});
