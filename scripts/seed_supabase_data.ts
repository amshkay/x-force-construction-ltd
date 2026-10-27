import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seed() {
  console.log('Seeding initial foundational data to live Supabase:', url);

  // 1. Categories
  const categories = [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      name: 'Interlocking Bricks & Blocks',
      slug: 'interlocking-bricks',
      description: 'Eco-friendly, precision-engineered soil-cement hydraulic interlocking blocks and hollow blocks.',
      image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
      is_active: true,
      sort_order: 1,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      name: 'Paving Stones & Walkway Pavers',
      slug: 'paving-stones',
      description: 'Heavy-duty industrial and residential concrete pavers, interlocking stones, and kerbs.',
      image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      is_active: true,
      sort_order: 2,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000003',
      name: 'Raw Aggregates & Binders',
      slug: 'aggregates-binders',
      description: 'High-grade Portland cement, sharp sand, granite quarry dust, and natural stone gravel.',
      image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
      is_active: true,
      sort_order: 3,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Coping & Structural Concrete',
      slug: 'coping-structural',
      description: 'Wall coping caps, pillar caps, precast lintels, drainage gutters, and fencing balustrades.',
      image_url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      is_active: true,
      sort_order: 4,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000005',
      name: 'Installation Accessories & Tools',
      slug: 'installation-accessories',
      description: 'Specialist alignment rubbers, bricklaying mallets, jointing sand, and sealer chemicals.',
      image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
      is_active: true,
      sort_order: 5,
    },
  ];

  for (const c of categories) {
    const { error } = await supabase.from('categories').upsert(c, { onConflict: 'slug' });
    if (error) console.error(`Error category ${c.name}:`, error.message);
  }
  console.log('✓ Categories seeded (5)');

  // 2. Products (using valid hex UUIDs starting with b1...)
  const products: any[] = [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      category_id: 'c1000000-0000-0000-0000-000000000002',
      name: '80mm Heavy-Duty Interlocking Paver (45 MPa)',
      slug: '80mm-heavy-duty-interlocking-paver',
      sku: 'PAV-80-HD-001',
      short_description: 'Engineered for ports, container staging yards, truck depots, and commercial arterial driveways.',
      description: 'Solid high-density interlocking concrete paving block manufactured on automated hydraulic vibratory presses with 45 MPa compressive strength rating.',
      unit: 'piece',
      cost_price: 130,
      selling_price: 185,
      minimum_stock: 5000,
      reorder_level: 2000,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: true,
      images: [
        'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { 'Compressive Strength': '45 MPa', Thickness: '80mm', 'Coverage Per m²': '40 blocks' },
      sort_order: 1,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      category_id: 'c1000000-0000-0000-0000-000000000002',
      name: '60mm Standard Interlocking Paver (30 MPa)',
      slug: '60mm-standard-interlocking-paver',
      sku: 'PAV-60-STD-002',
      short_description: 'Optimal for residential driveways, commercial parking bays, estate walkways, and garden patios.',
      description: 'Precision-moulded interlocking paver offering exceptional wear resistance, thermal comfort, and rapid installation speed.',
      unit: 'piece',
      cost_price: 100,
      selling_price: 145,
      minimum_stock: 4000,
      reorder_level: 1500,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: true,
      images: [
        'https://images.unsplash.com/photo-1584463623578-3011a6866164?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { 'Compressive Strength': '30 MPa', Thickness: '60mm', 'Coverage Per m²': '40 blocks' },
      sort_order: 2,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000003',
      category_id: 'c1000000-0000-0000-0000-000000000001',
      name: '220mm Hydraform Interlocking Earth Block',
      slug: '220mm-hydraform-interlocking-earth-block',
      sku: 'BLK-220-HYD-001',
      short_description: 'Precision mortarless dry-stack masonry block delivering 40% faster wall erection velocity.',
      description: 'Eco-engineered hydraulic compressed stabilized soil-cement block with integrated tongue-and-groove profile eliminating mortar beds between courses.',
      unit: 'piece',
      cost_price: 230,
      selling_price: 320,
      minimum_stock: 3000,
      reorder_level: 1000,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: true,
      images: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Dimensions: '220 x 220 x 115mm', 'Thermal Mass': 'High', Joint: 'Mortarless Dry-Stack' },
      sort_order: 3,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000004',
      category_id: 'c1000000-0000-0000-0000-000000000001',
      name: 'Cored Interlocking Conduit Block (220mm)',
      slug: 'cored-interlocking-conduit-block',
      sku: 'BLK-220-CRD-002',
      short_description: 'Twin vertical hollow channels for electrical conduits, plumbing pipes, and vertical steel tie rods.',
      description: 'Specialist interlocking block matching standard hydraform courses with internal hollow cores for reinforced grout columns and concealed utilities.',
      unit: 'piece',
      cost_price: 260,
      selling_price: 350,
      minimum_stock: 2000,
      reorder_level: 800,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: false,
      images: [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Core: 'Dual 75mm Diameter', Dimensions: '220 x 220 x 115mm' },
      sort_order: 4,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000005',
      category_id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Cast Concrete Barrier Kerb (125x250x500mm)',
      slug: 'cast-concrete-barrier-kerb',
      sku: 'CPG-KRB-BAR-001',
      short_description: 'Solid road boundary and paver containment restraint manufactured with high-strength granite aggregate.',
      description: 'Precast concrete barrier curb with chamfered profile for parking lots, road edging, and containment of paver fields against lateral movement.',
      unit: 'piece',
      cost_price: 1600,
      selling_price: 2200,
      minimum_stock: 500,
      reorder_level: 200,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: false,
      images: [
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Dimensions: '125 x 250 x 500mm', Grade: 'Grade 30 Vibrated' },
      sort_order: 5,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000006',
      category_id: 'c1000000-0000-0000-0000-000000000004',
      name: 'Precast Saddleback Wall Coping (300mm)',
      slug: 'precast-saddleback-wall-coping',
      sku: 'CPG-SDL-300-002',
      short_description: 'Dual-sloped architectural coping with integrated continuous drip throats to prevent wall water stains.',
      description: 'Weatherproof precast concrete coping capping for 9-inch walling and hydraform brick fence perimeters.',
      unit: 'piece',
      cost_price: 1300,
      selling_price: 1850,
      minimum_stock: 400,
      reorder_level: 150,
      requires_installation: true,
      is_active: true,
      is_published: true,
      is_featured: false,
      images: [
        'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Width: '300mm', Profile: 'Saddleback Peak' },
      sort_order: 6,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000007',
      category_id: 'c1000000-0000-0000-0000-000000000003',
      name: 'Sharp River Sand (20-Tonne Tipper Dump)',
      slug: 'sharp-river-sand-20t-tipper',
      sku: 'AGG-SND-TIP-001',
      short_description: 'Washed, graded coarse sharp river sand delivered directly to site via 20-tonne tipper truck.',
      description: 'Silt-free sharp river sand optimal for paver bedding screed layers, interlocking brick mortarless dry-mix, and structural concrete mixing.',
      unit: 'trip',
      cost_price: 110000,
      selling_price: 145000,
      minimum_stock: 5,
      reorder_level: 2,
      requires_installation: false,
      is_active: true,
      is_published: true,
      is_featured: false,
      images: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Volume: '20 Metric Tonnes', Purity: 'Washed, Low Silt (<3%)' },
      sort_order: 7,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000008',
      category_id: 'c1000000-0000-0000-0000-000000000003',
      name: 'Dangote 3X Portland Cement 42.5R (50kg Bag)',
      slug: 'dangote-3x-portland-cement-50kg',
      sku: 'AGG-CMT-50KG-002',
      short_description: 'Premium Grade 42.5R high-early-strength Portland cement for concrete precasting and block production.',
      description: 'Standard 50kg bag of rapid-hardening Portland limestone cement conforming to NIS 444-1:2014 standards.',
      unit: 'bag',
      cost_price: 9200,
      selling_price: 10500,
      minimum_stock: 100,
      reorder_level: 30,
      requires_installation: false,
      is_active: true,
      is_published: true,
      is_featured: false,
      images: [
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
      ],
      attributes: { Weight: '50kg', Grade: 'CEM II 42.5R' },
      sort_order: 8,
    },
  ];

  for (const p of products) {
    const { error } = await supabase.from('products').upsert(p, { onConflict: 'slug' });
    if (error) console.error(`Error product ${p.name}:`, error.message);
  }
  console.log('✓ Products seeded (8)');

  // 3. Product Variants
  const variants: any[] = [
    {
      id: 'ba000000-0000-0000-0000-000000000001',
      product_id: 'b1000000-0000-0000-0000-000000000001',
      name: 'Industrial Terracotta Red',
      sku: 'PAV-80-RED',
      color: 'Terracotta Red',
      size: '80mm (45 MPa)',
      finish: 'Matte Hydraulic Pressed',
      image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      price_override: null,
      is_active: true,
    },
    {
      id: 'ba000000-0000-0000-0000-000000000002',
      product_id: 'b1000000-0000-0000-0000-000000000001',
      name: 'Charcoal Black High-Torque',
      sku: 'PAV-80-BLK',
      color: 'Charcoal Black',
      size: '80mm (45 MPa)',
      finish: 'Carbon Infused',
      image_url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      price_override: 195,
      is_active: true,
    },
    {
      id: 'ba000000-0000-0000-0000-000000000003',
      product_id: 'b1000000-0000-0000-0000-000000000001',
      name: 'Natural Granite Grey',
      sku: 'PAV-80-GRY',
      color: 'Granite Grey',
      size: '80mm (45 MPa)',
      finish: 'Natural Aggregate',
      image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      price_override: null,
      is_active: true,
    },
    {
      id: 'ba000000-0000-0000-0000-000000000004',
      product_id: 'b1000000-0000-0000-0000-000000000003',
      name: 'Natural Clay Ochre',
      sku: 'BLK-220-OCHRE',
      color: 'Natural Ochre',
      size: '220 x 220 x 115mm',
      finish: 'Smooth Soil-Cement',
      image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
      price_override: null,
      is_active: true,
    },
    {
      id: 'ba000000-0000-0000-0000-000000000005',
      product_id: 'b1000000-0000-0000-0000-000000000003',
      name: 'Earthy Terracotta Red',
      sku: 'BLK-220-TERRA',
      color: 'Terracotta',
      size: '220 x 220 x 115mm',
      finish: 'Red Laterite Stabilized',
      image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      price_override: 335,
      is_active: true,
    },
  ];

  for (const v of variants) {
    const { error } = await supabase.from('product_variants').upsert(v, { onConflict: 'sku' });
    if (error) console.error(`Error variant ${v.name}:`, error.message);
  }
  console.log('✓ Product variants seeded (5)');

  // 4. Designs
  const designs = [
    {
      id: 'd7000000-0000-0000-0000-000000000001',
      title: '45° Interlocking Herringbone Pavement',
      slug: '45-degree-interlocking-herringbone',
      description: 'Supreme mechanical interlock providing maximum resistance to vehicle braking and rotational wheel shear. Ideal for driveways, container yards, and heavy-traffic commercial loading aprons.',
      category: 'Interlocking Paving',
      pattern_style: '45° Herringbone',
      application_type: 'Heavy Vehicle Yard',
      images: [
        'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      ],
      video_url: null,
      color_palette: [
        { name: 'Terracotta Red', hex: '#C05621' },
        { name: 'Charcoal Black', hex: '#2D3748' },
        { name: 'Natural Grey', hex: '#718096' },
      ],
      suitable_products: ['80mm Heavy-Duty Interlocking Paver', '60mm Standard Interlocking Paver'],
      is_published: true,
      sort_order: 1,
    },
    {
      id: 'd7000000-0000-0000-0000-000000000002',
      title: 'Mortarless Dry-Stack Stretcher Wall Bond',
      slug: 'mortarless-dry-stack-stretcher-wall',
      description: 'Eco-engineered dry-stack masonry utilizing precision tongue-and-groove interlocking blocks. Eliminates mortar bedding between courses, expedites construction velocity, and maintains superior thermal mass.',
      category: 'Structural Wall Masonry',
      pattern_style: 'Stretcher Bond (Dry-Stack)',
      application_type: 'Exterior Building Wall',
      images: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      ],
      video_url: null,
      color_palette: [
        { name: 'Natural Clay Ochre', hex: '#D69E2E' },
        { name: 'Earthy Terracotta', hex: '#9C4221' },
        { name: 'Granite Charcoal', hex: '#1A202C' },
      ],
      suitable_products: ['220mm Hydraform Interlocking Earth Block', 'Cored Interlocking Conduit Block'],
      is_published: true,
      sort_order: 2,
    },
    {
      id: 'd7000000-0000-0000-0000-000000000003',
      title: 'Basket Weave Pedestrian Terrace Bond',
      slug: 'basket-weave-pedestrian-terrace',
      description: 'Timeless geometric dual-paver layout combining pairs of blocks in alternating orthogonal orientations. Produces an elegant woven aesthetic for outdoor living spaces, pool patios, and garden plazas.',
      category: 'Interlocking Paving',
      pattern_style: 'Basket Weave',
      application_type: 'Pedestrian Walkway & Patio',
      images: [
        'https://images.unsplash.com/photo-1584463623578-3011a6866164?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
      video_url: null,
      color_palette: [
        { name: 'Sahara Sand', hex: '#E2E8F0' },
        { name: 'Sunset Terracotta', hex: '#DD6B20' },
      ],
      suitable_products: ['60mm Standard Interlocking Paver', '50mm Patio Paver Tile'],
      is_published: true,
      sort_order: 3,
    },
    {
      id: 'd7000000-0000-0000-0000-000000000004',
      title: 'Soldier Course Boundary & Kerb Edge Trim',
      slug: 'soldier-course-boundary-kerb-edge',
      description: 'Vertically stacked soldier pavers forming a distinct containment frame along roadway curbs, garden perimeters, and steps. Locks internal paver fields firmly against lateral displacement.',
      category: 'Perimeter & Trims',
      pattern_style: 'Soldier Course',
      application_type: 'Garden Edging & Trims',
      images: [
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
      ],
      video_url: null,
      color_palette: [
        { name: 'Midnight Charcoal', hex: '#171923' },
        { name: 'Industrial Grey', hex: '#4A5568' },
      ],
      suitable_products: ['Cast Concrete Barrier Kerb (125x250x500mm)', '60mm Standard Interlocking Paver'],
      is_published: true,
      sort_order: 4,
    },
  ];

  for (const d of designs) {
    const { error } = await supabase.from('designs').upsert(d, { onConflict: 'slug' });
    if (error) console.error(`Error design ${d.title}:`, error.message);
  }
  console.log('✓ Designs seeded (4)');

  // 5. Projects (using valid hex UUIDs e700...)
  const projects = [
    {
      id: 'e7000000-0000-0000-0000-000000000001',
      title: 'Atlantic Logistics Freight Terminal & Staging Yard',
      slug: 'atlantic-logistics-freight-terminal',
      category: 'Industrial Yard',
      location: 'Ibeju-Lekki Free Trade Zone, Lagos State',
      client_type: 'Commercial',
      status: 'completed',
      completion_date: 'November 2025',
      description: 'Turnkey paving of a 4,800m² heavy container staging yard designed to withstand axle loads up to 140 kN. Constructed with high-density 80mm interlocking pavers over laser-graded sub-base and stone-dust bedding.',
      scope_summary: '4,800 m² heavy-duty paving, sub-base compaction testing, perimeter retaining kerbs, and integrated storm-water runoff drainage.',
      materials_used: [
        '80mm Heavy-Duty Interlocking Paver (45 MPa)',
        'Sharp River Sand Bedding',
        'Granite Stone Dust (0-5mm)',
        'Cast Concrete Heavy Kerbs',
      ],
      cover_image_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      gallery_media: [
        {
          id: 'pm-01-before',
          url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
          caption: 'Site cleared and graded prior to sub-base compaction and geotextile installation.',
          phase: 'before',
          sortOrder: 1,
        },
        {
          id: 'pm-01-during-1',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
          caption: 'Laser leveling of sharp sand bedding layer and laying 45° herringbone paver matrix.',
          phase: 'during',
          sortOrder: 2,
        },
        {
          id: 'pm-01-during-2',
          url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
          caption: 'Vibratory plate compaction with rubber protective mat to lock kiln-dried joint sand.',
          phase: 'during',
          sortOrder: 3,
        },
        {
          id: 'pm-01-after',
          url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
          caption: 'Fully operational container staging apron delivered ahead of schedule.',
          phase: 'after',
          sortOrder: 4,
        },
      ],
      video_url: null,
      is_published: true,
      sort_order: 1,
    },
    {
      id: 'e7000000-0000-0000-0000-000000000002',
      title: 'The Palms Luxury Villa Residential Dry-Stack Facade',
      slug: 'the-palms-luxury-villa-facade',
      category: 'Residential Building',
      location: 'Banana Island, Ikoyi, Lagos',
      client_type: 'Residential',
      status: 'completed',
      completion_date: 'January 2026',
      description: 'High-end contemporary private residence featuring exposed interlocking earth brick walls. Mortarless dry-stack installation paired with high-performance matte silicone sealant provides aesthetic warmth and natural acoustic dampening.',
      scope_summary: '3-story residential perimeter facade, exposed interior feature columns, and entrance foyer masonry.',
      materials_used: [
        '220mm Hydraform Interlocking Earth Block',
        'High-Strength Reinforced Grout',
        'Breathable Siloxane Water-Repellent Sealant',
      ],
      cover_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      gallery_media: [
        {
          id: 'pm-02-before',
          url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
          caption: 'Engineered raft foundation completed with vertical starter dowels positioned for block alignment.',
          phase: 'before',
          sortOrder: 1,
        },
        {
          id: 'pm-02-during',
          url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
          caption: 'Dry-stack assembly of interlocking blocks with rubber mallets ensuring 0mm mortar joint tolerance.',
          phase: 'during',
          sortOrder: 2,
        },
        {
          id: 'pm-02-after',
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          caption: 'Completed residence showcasing rich natural earth tones and clean architectural shadow lines.',
          phase: 'after',
          sortOrder: 3,
        },
      ],
      video_url: null,
      is_published: true,
      sort_order: 2,
    },
    {
      id: 'e7000000-0000-0000-0000-000000000003',
      title: 'Epe Waterfront Estate Architectural Perimeter Enclosure',
      slug: 'epe-waterfront-estate-perimeter',
      category: 'Perimeter Wall',
      location: 'Epe Resort Expressway, Lagos State',
      client_type: 'Commercial',
      status: 'completed',
      completion_date: 'December 2025',
      description: '1.2km structural perimeter wall engineered for high wind load resistance along the coastal breeze corridor. Features reinforced interlocking piers every 3.5m and decorative saddleback coping caps.',
      scope_summary: '1,200 linear meters of 2.7m-high security boundary walling including reinforced pillar columns and capping.',
      materials_used: [
        '220mm Hydraform Interlocking Earth Block',
        'Precast Concrete Saddleback Wall Coping (300mm)',
        '12mm High-Yield Reinforcement Rebar',
      ],
      cover_image_url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      gallery_media: [
        {
          id: 'pm-03-before',
          url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
          caption: 'Trench excavation and lean concrete blinding along 1.2km estate perimeter contour.',
          phase: 'before',
          sortOrder: 1,
        },
        {
          id: 'pm-03-during',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
          caption: 'Rapid interlocking block wall erection by trained XFORCE certified installation crew.',
          phase: 'during',
          sortOrder: 2,
        },
        {
          id: 'pm-03-after',
          url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
          caption: 'Finished perimeter security wall with decorative concrete coping.',
          phase: 'after',
          sortOrder: 3,
        },
      ],
      video_url: null,
      is_published: true,
      sort_order: 3,
    },
    {
      id: 'e7000000-0000-0000-0000-000000000004',
      title: 'Victoria Corporate Plaza Commercial Driveway & Apron',
      slug: 'victoria-corporate-plaza-driveway',
      category: 'Commercial Paving',
      location: 'Victoria Island Central Business District, Lagos',
      client_type: 'Commercial',
      status: 'in_progress',
      completion_date: 'Target: April 2026',
      description: 'Refurbishment and modernization of bank headquarters parking lot and circular VIP driveway. Incorporating dual-tone charcoal and beige interlocking stones with high-contrast disabled parking demarcations.',
      scope_summary: '2,200 m² commercial parking lot rehabilitation, sub-grade rectification, and pedestrian sidewalk paving.',
      materials_used: [
        '60mm Standard Interlocking Paver (Dual Tone)',
        'Sub-base Crushed Stone Granite',
        'Drainage Channel Precast Gutters',
      ],
      cover_image_url: 'https://images.unsplash.com/photo-1584463623578-3011a6866164?auto=format&fit=crop&w=1200&q=80',
      gallery_media: [
        {
          id: 'pm-04-before',
          url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1200&q=80',
          caption: 'Demolition and extraction of aged cracked asphalt surface.',
          phase: 'before',
          sortOrder: 1,
        },
        {
          id: 'pm-04-during',
          url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
          caption: 'Crushed stone aggregate compaction and bedding screed alignment.',
          phase: 'during',
          sortOrder: 2,
        },
      ],
      video_url: null,
      is_published: true,
      sort_order: 4,
    },
  ];

  for (const pr of projects) {
    const { error } = await supabase.from('projects').upsert(pr, { onConflict: 'slug' });
    if (error) console.error(`Error project ${pr.title}:`, error.message);
  }
  console.log('✓ Projects seeded (4)');

  // 6. Media Records (using valid hex UUIDs f700...)
  const mediaRecords = [
    {
      id: 'f7000000-0000-0000-0000-000000000001',
      storage_provider: 'supabase',
      storage_bucket: 'project-media',
      storage_path: 'projects/atlantic-terminal-yard.jpg',
      public_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      file_name: 'atlantic-terminal-yard.jpg',
      mime_type: 'image/jpeg',
      file_size: 1420500,
      alt_text: 'Heavy-duty 80mm interlocking paver container apron in Ibeju-Lekki',
      caption: 'Atlantic Logistics Freight Terminal & Staging Yard',
      category: 'Completed Projects',
      entity_type: 'project',
      entity_id: 'e7000000-0000-0000-0000-000000000001',
      is_published: true,
    },
    {
      id: 'f7000000-0000-0000-0000-000000000002',
      storage_provider: 'supabase',
      storage_bucket: 'project-media',
      storage_path: 'designs/45-degree-herringbone-pave.jpg',
      public_url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      file_name: '45-degree-herringbone-pave.jpg',
      mime_type: 'image/jpeg',
      file_size: 1890300,
      alt_text: '45 degree interlocking herringbone pavement bond pattern',
      caption: 'High-torque pavement shear resistance pattern',
      category: 'Design Inspiration',
      entity_type: 'design',
      entity_id: 'd7000000-0000-0000-0000-000000000001',
      is_published: true,
    },
    {
      id: 'f7000000-0000-0000-0000-000000000003',
      storage_provider: 'supabase',
      storage_bucket: 'project-media',
      storage_path: 'projects/palms-villa-ikoyi.jpg',
      public_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      file_name: 'palms-villa-ikoyi.jpg',
      mime_type: 'image/jpeg',
      file_size: 2150000,
      alt_text: 'The Palms Luxury Villa dry-stack exterior wall masonry in Ikoyi',
      caption: 'Exposed Hydraform interlocking brick facade',
      category: 'Completed Projects',
      entity_type: 'project',
      entity_id: 'e7000000-0000-0000-0000-000000000002',
      is_published: true,
    },
    {
      id: 'f7000000-0000-0000-0000-000000000004',
      storage_provider: 'supabase',
      storage_bucket: 'project-media',
      storage_path: 'designs/basket-weave-terrace.jpg',
      public_url: 'https://images.unsplash.com/photo-1584463623578-3011a6866164?auto=format&fit=crop&w=1200&q=80',
      file_name: 'basket-weave-terrace.jpg',
      mime_type: 'image/jpeg',
      file_size: 1340100,
      alt_text: 'Basket weave interlocking paver layout for residential patio',
      caption: 'Dual paver basket weave arrangement',
      category: 'Design Inspiration',
      entity_type: 'design',
      entity_id: 'd7000000-0000-0000-0000-000000000003',
      is_published: true,
    },
  ];

  for (const m of mediaRecords) {
    const { error } = await supabase.from('media').upsert(m, { onConflict: 'id' });
    if (error) console.error(`Error media ${m.file_name}:`, error.message);
  }
  console.log('✓ Media records seeded (4)');

  console.log('\n🎉 ALL FOUNDATIONAL DATA SEEDED SUCCESSFULLY TO SUPABASE!');
}

seed().catch(console.error);
