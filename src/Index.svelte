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
            <h4 
                class="tamil translated bold clickable"
                on:click={() => dispatch('request', { start: chapter.kurals[0] })}
            >{chapter.name} / {chapter.translation}</h4><br/>

            {#each chapter.chapters as chapter}
                <h5 
                    class="tamil translated bold clickable"
                    on:click={() => dispatch('request', { start: chapter.se[0] })}
                >{chapter.name} / {chapter.translation}</h5><br/>
            {/each}
        {/each}
    {/each}
</div>