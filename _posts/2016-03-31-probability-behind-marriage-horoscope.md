---
layout: post
title: Probability behind marriage horoscope
---

Most of the Indians do arranged marriage. One part of the process is
the horoscope matching. The horoscope matching process itself varies
based on language, religion, caste, location etc. I am going to
dissect one such process which is mainly followed by people in south
India. I don't have much knowledge about horoscope or anything related
to astrology, neither do I believe in it. So it is possible that I
might have misunderstood some aspects of the process. So take anything
I say with a grain of salt. I am using [tamilhoroscope.in][source]
as the main source for the rules.

Porutham is a sub part of the matching process. Each individual
porutham projects a specific aspect of a marriage life. For example
Dhinam porutham projects the opinion and understanding between the
couples in everyday life. There are 8 main poruthams namely Dhinam,
Ganam, Mahendra, Rasi, Nadi, Yoni, Rajji and Vedhai. Every porutham
need not match to be considered a successful match. A successful match
can be succinctly described using boolean operators as

`(Dhinam || Ganam) && (Mahendra || Rasi || Nadi) && Yoni && Rajji &&
Vedhai`


There are 27 [nakshatras][nakshatras] and 12 [rasis][rasis]. A
person's rasi and nakshatra are calculated using their birth date and
time. Each porutham can be described as a set of rules.

### Dhinam

> For each and every day to be a very special day for the couples they
> must have their match of Dhina porutham. Only this match will
> eliminate the difference of opinion and misunderstanding between the
> couples. This match is made as follows:
>
> 1. If a remainder of 2, 4, 6, 8, 9 is obtained when you divide the
>    counting of stars from female’s star to male’s star by 9 then this
>    match is fulfilled.
>
> 2. If the counting from female’s star to male’s star is 2, 4, 6, 8, 9,
>    11, 13, 15, 17, 18, 20, 22, 26, 27 then this match is fulfilled.
>
> 3. If both male and female are of the same rasi or belong to different
>    Phase of the same star then this match is fulfilled.
>
> 4. If both male and female are of Bharani, Avittam, Sadhayam or
>    Poorattathi stars then this match is not fulfilled. Both having any
>    of the above stars for them should in fact avoid getting married.

<div id="rule_dhinam"></div>

### Ganam

> There are 3 Ganams as per astrology. They are Deiva Ganam, Manitha
> Ganam, Ratchasa Ganam. All the stars would definitely fall in any one
> of the above ganams. This match is viewed especially to arrive at the
> tolerance level between the couples. If the couples have this match in
> their horoscope then they will tolerate each other and avoid
> misunderstandings.
>
> 1. Ashwini, Murugashreedam, Punarpoosam, Poosam, Hastham, Swathi,
> Anusham, Thiruvonam and Revathi are the stars belonging to <span
> style="color: rgb(31, 119, 180);">Deiva</span> ganam.
>
> 2. Bharani, Rohini, Thiruvadirai, Pooram, Uthiram, Pooradam,
> Uthiradam, Poorattathi and Uthirattathi are the stars belonging to
> <span style="color: rgb(255, 127, 14)">Manitha</span> ganam.
>
> 3. Karthigai, Aayilyam, Magam, Chittirai, Visakam, Kettai, Moolam,
> Avittam and Sathayam are the starts belongings to <span
> style="color: rgb(44, 160, 44)">Ratchasa</span> ganam.
>
> A male and a female belonging to the same ganam or even if either
> belong to deiva ganam and other belong to manitha ganam they can get
> married.
>
> If the male belong to deiva ganam and the female belong to ratchasa
> ganam then they do not have gana porutham on the contrary if the
> female belong to deiva ganam and the male belong to ratchasa ganam
> then this match is fulfilled.

<div id="rule_ganam"></div>

### Mahendra

> Mahendra porutham is matched for puthira bakkiyam(blessed with a
> child). This match will hint the flow of the generations of that
> particular family.
>
> If the counting from the female star to the male star is 4, 7, 10,
> 13, 16, 19, 22, 25 then this match is fulfilled.

<div id="rule_mahendra"></div>

### Rasi

> Rasi porutham is one of the many matches looked for vamsa viruthi
> and as per few sasthras this match will give all the happiness and
> the blessings to have a male child for the couples getting married.
>
> If the counting from the female star to the male star
>
> Is above 6 then matching is fulfilled
>
> Is 8 then there is no match
>
> Is 7 then the matching is excellent
>
> Is 2, 6, 8, 12 then there is no match
>
> Is 1, 3, 5, 9, 10, 11 then the matching is ok
>
> Also Kumbam and Simam, Magaram and Kadagam are the rasis that do not
> match with each other.

<div id="rule_rasi"></div>

### Nadi

> This match is being looked for to denote the matching between the
> blood groups of the male and female. Budhira Bakkiyam for the couples
> having this match is confirmed.
>
> In general Nadi is divided into three divisions. If both male and
> female belong to the same Nadi then this match is not full
> filled. And if both Male and female are of different Nadi then this
> match is fullfilled.
>
> <span style="color: rgb(31, 119, 180)">Paarsuva</span> Nadi -
> Ashwini, Thiruvathirai, Punarpoosam, Uthiram, Astham, Kettai,
> Moolam, Sathayam, Puratahi
>
> <span style="color: rgb(255, 127, 14)">Madhya</span> Nadi - Barani,
> Mirugasrisham, Poosam, Puram, Sitthirai, Anusham, Puradam, Avitam,
> Uthiratathi
>
> <span style="color: rgb(44, 160, 44)">Samana</span> Nadi -
> Karthigai, Rohini, Ayilam, Magam, Swathi, Visakam, Uthiradam,
> Thiruvonam, Revathi

<div id="rule_nadi"></div>

### Yoni

> As per this match each and every star is identified as an animal. This
> match is not fulfilled if there is a enemity between the
> yoni(animals). And for fulfillment of this match there should not be
> enemity between the animals(yoni) matched.
>
> Aswini - 🐴 Male Horse  
> Baraṇi - 🐘 Male Elephant  
> Karthikai - 🐐 Female Goat  
> Rohiṇi - 🐍 Male Snake  
> Mirugasīridam - 🐍 Female Snake  
> Thiruvādhirai - 🐶 Female Dog  
> Punarpoosam - 🐈 Female Cat  
> Poosam - 🐐 Male Goat  
> Ayilyam - 🐈 Male Cat  
> Magam - 🐀 Male Rat  
> Pooram - 🐀 Female Rat  
> Uthiram - 🐮 Male Cow  
> Astham - 🐃 Female Buffalo  
> Chithirai - 🐯 Female Tiger  
> Swathi - 🐃 Male Buffalo  
> Visakam - 🐯 Male Tiger  
> Anusham - Female Deer  
> Kettai - Male Deer  
> Mulam - 🐶 Male Dog  
> Puradam - 🐵 Male Monkey  
> Uthirādam - Male Mongoose  
> Tiruvōnam - 🐵 Female Monkey  
> Aviṭṭam - 🦁 Female Lion  
> Sadayam - 🐴 Female Horse  
> Puraṭṭādhi - 🦁 Male Lion  
> Uttṛṭṭādhi - 🐮 Female Cow  
> Revathi - 🐘 Female Elephant  
>
> **Animals with Enemity**
>
> <span style="color: rgb(214, 39, 40)">🐍 Snake x Mongoose</span>  
> <span style="color: rgb(255, 127, 14)">🐘 Elephant x 🦁 Lion</span>  
> <span style="color: rgb(44, 160, 44)">🐵 Monkey x 🐐 Goat</span>  
> <span style="color: rgb(148, 103, 189)">Deer x 🐶 Dog</span>  
> <span style="color: rgb(140, 86, 75)">🐀 Rat x 🐈 Cat</span>  
> <span style="color: rgb(31, 119, 180)">🐴 Horse x 🐃 Buffalo</span>  
> <span style="color: rgb(227, 119, 194)">🐮 Cow x 🐯 Tiger</span>  

<div id="rule_yoni"></div>

### Rajii

> This is the most important match that is looked for while matching the
> horoscopes. For the persons getting married, even if nine out of ten
> matches are full filled and if this Rajji porutham is not fulfilled
> then it is not recommended for them to get married. Our ancestors have
> given such an importance for this match. Rajju is being divided into
> five parts.
>
> <span style="color: rgb(148, 103, 189)">Siro Rajii</span> - Mirugasrisham, Sitthirai, Avittam
>
> **Kanda Rajii**  
> <span style="color: rgb(214, 39, 40)">Arohanam</span> - Rohini, Astham, Thiruvonam  
> <span style="color: rgb(140, 86, 75)">Avaraohanam</span> - Thiruvathirai, Swathi, Sathayam
>
> **Uthara Rajii**  
> <span style="color: rgb(44, 160, 44)">Arohanam</span> - Karthigai, Utharam, Uthradasm  
> <span style="color: rgb(227, 119, 194)">Avaraohanam</span> - Punarpoosam, Visaham, Purattathi
>
> **Uuru Rajii**  
> <span style="color: rgb(255, 127, 14)">Arohanam</span> - Barani, Pooram, Pooradam  
> <span style="color: rgb(127, 127, 127)">Avaraohanam</span> - Poosam, Anusham, Utthiratathi
>
> **Paadha Rajii**  
> <span style="color: rgb(31, 119, 180)">Arohanam</span> - Aswini, Magam, Mulam  
> <span style="color: rgb(188, 189, 34)">Avaraohanam</span> - Ayilam, Kettai, Revathi
>
> Matches are looked for in such a way that if the stars of both male
> and female are not of the same Rajji then the female will lead the
> life as Dhirka Sumangali.
>
> There are two divisions in the same Rajju like Arohanam and
> Avaraohanam. There is an opinion that even If the stars of the male
> and the female are of the same Rajju but belong to Arohanam and
> Avarohanam then the horoscopes are matched and proceeded for marriage.

<div id="rule_rajii"></div>

### Vethai

>This Vethai Porutham denotes the power of Mangalya Kayiru and is one
>of the basic match that is being looked for. If both male and the
>female stars are Vethai then this match is not fullfilled and the
>others have Vethai match.
>
>Ashwini - Kettai  
>Bharani - Anusham  
>Karthikai - Visakam  
>Rohini - Swathi  
>Thiruvathirai - Thiruvonam  
>Punarpoosam - Uthiradam  
>Poosam - Puradam  
>Ayilam - Moolam  
>Magam - Revathi  
>Puram - Uthiratathi  
>Uthiram - Uthiratathi  
>Hastham - Sathayam
>
>Above are the stars that do not match with each other. And matching
>the above stars is not a good match.

<div id="rule_vethai"></div>

### Dhinam || Ganam

<div id="rule_dhinam_ganam"></div>

### Mahendra || Rasi || Nadi

<div id="rule_mahendra_rasi_nadi"></div>

### (Dhinam || Ganam) && (Mahendra || Rasi || Nadi) && Yoni && Rajii && Vethai

<div id="rule_porutham"></div>

<link rel="stylesheet" href="/public/css/astro.css"/>
<script src="/public/js/d3.js"></script>
<script src="/public/js/underscore.js"></script>
<script src="/public/js/astro.js"></script>

[source]: http://www.tamilhoroscope.in/marriage_matching_tamil_horoscope.php
[nakshatras]: https://en.wikipedia.org/wiki/List_of_Nakshatras
[rasis]: https://en.wikipedia.org/wiki/Hindu_astrology#R.C4.81.C5.9Bi_.E2.80.93_zodiacal_signs
