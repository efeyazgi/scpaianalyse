Schott Orim Cam - Yapay Zeka Destekli İPK Platformu
Proje Hakkında

Bu proje, Schott Orim Cam için geliştirilmiş, web tabanlı, modern ve akıllı bir İstatistiksel Proses Kontrol (İPK) platformudur. Amacı, Minitab gibi geleneksel İPK yazılımlarına bir alternatif sunarak, süreç verilerinin analizini daha hızlı, daha sezgisel ve yapay zeka destekli yorumlarla daha anlamlı hale getirmektir.

Uygulama, kullanıcıların çeşitli formatlardaki (Excel, CSV, metin) verilerini kolayca sisteme aktarmasını, standart İPK analizlerini (XR, Pareto, Cp/Cpk) anında oluşturmasını ve bu analizler üzerine Google Gemini API entegrasyonu sayesinde derinlemesine, profesyonel raporlar ve öneriler almasını sağlar.
Temel Özellikler

    Esnek Veri Girişi: Sabit tablolara bağlı kalmadan, kullanıcıların farklı formatlardaki verilerini kopyala-yapıştır yöntemiyle sisteme aktarmasına olanak tanır.

    Yapay Zeka Destekli Veri Yorumlama: Girilen ham veriyi Gemini API'si aracılığıyla analiz ederek otomatik olarak yapısal bir formata (JSON) dönüştürür.

    XR Kontrol Grafikleri: Sürecin istatistiksel olarak kontrol altında olup olmadığını görselleştiren X-bar ve R grafiklerini dinamik olarak oluşturur.

    Süreç Yeterlilik Analizi (Cp & Cpk): Sürecin müşteri spesifikasyonlarını karşılama potansiyelini ve fiili performansını ölçen Cp ve Cpk indekslerini hesaplar ve görselleştirir.

    Pareto Analizi: 80/20 kuralına dayanarak hata türlerini önem sırasına göre sıralar ve iyileştirme çabalarının odaklanması gereken "hayati azınlığı" belirler.

    AI Destekli Raporlama: Her analiz için, sonuçları profesyonel bir dilde yorumlayan, olası nedenleri listeleyen ve somut iyileştirme önerileri sunan yapay zeka destekli raporlar üretir.

Teknoloji Stack'i

    Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)

    Styling: Tailwind CSS (CDN üzerinden)

    Grafik Kütüphanesi: Chart.js (CDN üzerinden)

    Markdown Yorumlayıcı: Marked.js (CDN üzerinden)

    Yapay Zeka Servisi: Google Gemini API

Dosya Yapısı

Proje, basitliği ve taşınabilirliği ön planda tutarak üç temel dosyadan oluşur:

    index.html: Uygulamanın ana HTML iskeletini ve sekmeler, butonlar gibi tüm arayüz elemanlarını içerir.

    style.css: Uygulamanın genel görünümü, renk paleti ve özel arayüz stillerini barındırır.

    script.js: Uygulamanın tüm mantığını içerir. Bu dosya aşağıdaki görevlerden sorumludur:

        Kullanıcı etkileşimlerini (buton tıklamaları, veri girişi) yönetme.

        Tüm istatistiksel hesaplamaları (ortalama, standart sapma, kontrol limitleri, Cp/Cpk) yapma.

        Gemini API'ye istek göndererek veri yorumlama ve analiz raporları oluşturma.

        Chart.js kullanarak tüm grafikleri dinamik olarak çizme ve güncelleme.

        Sekmeler arası geçişi ve arayüz güncellemelerini yönetme.

Projeyi Yerel Olarak Çalıştırma

    Yukarıda belirtilen üç dosyayı (index.html, style.css, script.js) aynı klasör içine yerleştirin.

    Localde bir python sunucusu başlatıp uygulamayı çalıştırabilirsiniz.

Not: Uygulamanın yapay zeka özelliklerinin çalışabilmesi için script.js dosyasındaki apiKey değişkenine geçerli bir Google Gemini API anahtarı girilmiş olmalıdır.
Çalışma Mantığı (Workflow)

    Veri Girişi: Kullanıcı, "Veri Girişi" sekmesindeki metin alanına verilerini yapıştırır ve (gerekliyse) spesifikasyon limitlerini girer.

    Analiz Başlatma: Kullanıcı "VERİYİ YORUMLA VE ANALİZ ET" butonuna tıklar.

    AI Veri Ayrıştırma: script.js, girilen ham metni, yapısal JSON formatına dönüştürmesi için bir prompt ile birlikte Gemini API'ye gönderir.

    Hesaplama ve Görselleştirme: API'den dönen temiz ve yapısal JSON verisi kullanılarak tüm istatistiksel hesaplamalar yapılır. Ardından, bu hesaplamalara göre tüm sekmelerdeki grafikler (XR, Pareto vb.) Chart.js ile oluşturulur ve analiz özetleri ekrana yazdırılır.

    AI Yorumlama: Kullanıcı, herhangi bir analiz sekmesindeki "✨ Analizi Yorumla ve Öneri Al" butonuna tıkladığında, o analize özel hesaplanmış verilerle (kontrol limitleri, Cpk değeri vb.) yeni bir prompt oluşturulur ve Gemini API'ye gönderilir.

    Rapor Sunumu: Gemini'den dönen profesyonel rapor, Marked.js kütüphanesi ile HTML formatına dönüştürülerek kullanıcıya sunulur.
