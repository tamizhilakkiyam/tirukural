<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
</script>

<div class="indices">
    <h1 class="tamil translated bold">பொருளடக்கம் / Index</h1><br/>

    {#each window.kuralIndices as section}
        <h3 
            class="tamil translated bold clickable" 
            on:click={() => dispatch('request', { start: section.kurals[0] })}
        >{section.name} / {section.translation}</h3><br/>

        {#each section.chapters as chapter}
            <h4 class="tamil translated bold">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => {
                    document.getElementById(`cha-${chapter.kurals[0]}`).classList.toggle('hidden')
                }}><i class="fas fa-chevron-right"></i></a>

                <p 
                    on:click={() => dispatch('request', { start: chapter.kurals[0] })}
                >{chapter.name} / {chapter.translation}</p>
            </h4>

            <div id="cha-{chapter.kurals[0]}" class="hidden subcontents">
                {#each chapter.chapters as childChapter}
                    <h5 
                        class="tamil translated bold clickable"
                        on:click={() => dispatch('request', { start: childChapter.se[0] })}
                    >{childChapter.name} / {childChapter.translation}</h5><br/>
                {/each}
            </div>
        {/each}
    {/each}
</div>