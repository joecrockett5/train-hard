import { type VariantProps, tv } from 'tailwind-variants';
import Root from './badge.svelte';

const badgeVariants = tv({
	base: 'focus:ring-ring inline-flex select-none items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
	variants: {
		variant: {
			default: 'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent',
			secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
			destructive:
				'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
			outline: 'text-foreground',
			// Colour comes from the --tag custom property the caller sets; see
			// `.tag-badge` in app.css.
			tag: 'tag-badge'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});

type Variant = VariantProps<typeof badgeVariants>['variant'];

export {
	Root,
	type Variant,
	//
	Root as Badge,
	badgeVariants
};
