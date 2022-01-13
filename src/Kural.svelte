<script>
    export let kural;
    export let kuralEnn;

    let section, chapter, subChapter;

    $: for (let i = 0; i < window.kuralIndices.length; i++) {
        let [start, end] = window.kuralIndices[i].kurals;

        if (kuralEnn <= end && kuralEnn >= start) {
            let section1 = window.kuralIndices[i];
            section = [section1.name, section1.translation];

            for (let i = 0; i < section1.chapters.length; i++) {
                [start, end] = section1.chapters[i].kurals;

                if (kuralEnn <= end && kuralEnn >= start) {
                let chapter1 = section1.chapters[i];
                chapter = [chapter1.name, chapter1.translation];

                    for (let i = 0; i < chapter1.chapters.length; i++) {
                        [start, end] = chapter1.chapters[i].se;

                        if (kuralEnn <= end && kuralEnn >= start) {
                            let subChapter1 = chapter1.chapters[i];
                            subChapter = [subChapter1.name, subChapter1.translation];
                            break;
                        }
                    }

                    break;
                }
            }
                
            break;
        }
    }
</script>

<p class="tamil">குறள் {kuralEnn} / Kural {kuralEnn}</p>

{#each kural.li.split('\n') as ln}
    <p class="tamil kural-line">{ln}</p>
{/each}

<div class="vilakam">
    <p class="tamil translated kural-bold">பால் / Section: </p>
    <p class="tamil translated">{section[0]} / {section[1]}</p><br/>

    <p class="tamil translated kural-bold">இயல் / Chapter: </p>
    <p class="tamil translated">{chapter[0]} / {chapter[1]}</p><br/>

    <p class="tamil translated kural-bold">அதிகாரம் / Sub-Chapter: </p>
    <p class="tamil translated">{subChapter[0]} / {subChapter[1]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">மு.வரதராசன் அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[0]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">சாலமன் பாப்பையா அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[1]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">சிவயோகி சிவக்குமார் அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[2]}</p>
</div>

<div class="vilakam">
    <p class="english kural-bold">English Couplet</p>
    <p class="english kural-english">{kural.cpl}</p>

    <p class="english kural-bold">English Definition</p>
    <p class="english kural-english">{kural.tl}</p>

    <p class="english kural-bold">English Transliteration</p>
    {#each kural.tlr.split('\n') as ln}
        <p class="english kural-english">{ln}</p>
    {/each}
</div>